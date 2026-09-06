import { createHmac, timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ResendReceivedEvent = {
  type: string
  created_at?: string
  data?: {
    email_id?: string
    created_at?: string
    from?: string
    to?: string[]
    cc?: string[]
    bcc?: string[]
    message_id?: string
    subject?: string
  }
}

type ReceivedEmail = {
  id?: string
  from?: string
  to?: string[]
  cc?: string[]
  bcc?: string[]
  subject?: string
  text?: string | null
  html?: string | null
  message_id?: string | null
  headers?: Record<string, string> | null
}

type EmailRoute = {
  id: string
  address: string
  label: string
  bucket: string
  display_name: string
  forward_to: string[] | null
  forward_enabled: boolean
  is_active: boolean
  accepts_inbound: boolean
}

function verifyWebhook(payload: string, headers: Headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (!secret) return false

  const id = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const signatureHeader = headers.get('svix-signature')

  if (!id || !timestamp || !signatureHeader) return false

  const numericTimestamp = Number(timestamp)
  if (!Number.isFinite(numericTimestamp)) return false

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - numericTimestamp) > 300) return false

  const encodedSecret = secret.startsWith('whsec_')
    ? secret.slice('whsec_'.length)
    : secret

  let secretBytes: Buffer
  try {
    secretBytes = Buffer.from(encodedSecret, 'base64')
  } catch {
    return false
  }

  const signedContent = `${id}.${timestamp}.${payload}`
  const expected = createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest()

  return signatureHeader
    .split(' ')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      const [version, signature] = entry.split(',', 2)
      if (version !== 'v1' || !signature) return false

      try {
        const actual = Buffer.from(signature, 'base64')
        return actual.length === expected.length && timingSafeEqual(actual, expected)
      } catch {
        return false
      }
    })
}

function parseMailbox(value?: string | null) {
  const raw = value?.trim() ?? ''
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/)

  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, '') || match[2].trim(),
      email: match[2].trim().toLowerCase(),
    }
  }

  return {
    name: raw || 'Email sender',
    email: raw.toLowerCase(),
  }
}

function normalizeHeader(headers: Record<string, string> | null | undefined, name: string) {
  if (!headers) return null
  const match = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  )
  return match?.[1]?.trim() || null
}

function ownerNotificationCopy(bucket: string) {
  switch (bucket) {
    case 'billing':
      return { title: 'New billing email', severity: 'warning' }
    case 'partnerships':
      return { title: 'New partnership inquiry', severity: 'info' }
    case 'legal':
      return { title: 'New legal email', severity: 'warning' }
    case 'general':
      return { title: 'New contact email', severity: 'info' }
    default:
      return { title: 'New support email', severity: 'info' }
  }
}

async function getReceivedEmail(emailId: string): Promise<ReceivedEmail | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return null

  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    console.error('Unable to retrieve received Resend email:', response.status)
    return null
  }

  return (await response.json()) as ReceivedEmail
}

async function notifyOwners({
  admin,
  route,
  senderEmail,
  subject,
  supportRequestId,
  providerMessageId,
}: {
  admin: any
  route: EmailRoute
  senderEmail: string
  subject: string
  supportRequestId: string
  providerMessageId: string
}) {
  const { data: owners, error: ownerError } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'owner')

  if (ownerError) {
    console.error('Unable to load Owner notification recipients:', ownerError)
    return
  }

  const ownerRows = (owners ?? []) as Array<{ id?: string | null }>
  const ownerIds = ownerRows
    .map((owner) => owner.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  if (ownerIds.length === 0) return

  const copy = ownerNotificationCopy(route.bucket)
  const safeSubject = subject.slice(0, 160)
  const rows = ownerIds.map((ownerId) => ({
    user_id: ownerId,
    type: 'owner_support_email',
    severity: copy.severity,
    title: copy.title,
    message: `${senderEmail} — ${safeSubject}`.slice(0, 500),
    action_url: '/dashboard/owner/support/requests',
    action_label: 'Open support inbox',
    source_key: `inbound_email:${providerMessageId}`,
    metadata: {
      support_request_id: supportRequestId,
      bucket: route.bucket,
      inbound_to: route.address,
      sender_email: senderEmail,
    },
  }))

  const { error } = await admin
    .from('notifications')
    .upsert(rows, { onConflict: 'user_id,source_key', ignoreDuplicates: true })

  if (error) {
    console.error('Unable to create Owner inbound-email notifications:', error)
  }
}

async function forwardCopy({
  route,
  sender,
  subject,
  body,
}: {
  route: EmailRoute
  sender: string
  subject: string
  body: string
}) {
  if (!route.forward_enabled) return

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return

  const recipients = Array.from(
    new Set(
      (route.forward_to ?? [])
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
        .filter((email) => !email.endsWith('@raisehub.app'))
    )
  ).slice(0, 50)

  if (recipients.length === 0) return

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${route.display_name} <${route.address}>`,
      to: recipients,
      subject: `[RaiseHub ${route.label}] ${subject}`,
      text: `From: ${sender}\nTo: ${route.address}\n\n${body}`,
      reply_to: route.address,
      tags: [
        { name: 'product', value: 'raisehub' },
        { name: 'category', value: 'inbound-forward' },
        { name: 'bucket', value: route.bucket },
      ],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    console.error('Unable to forward inbound RaiseHub email:', response.status)
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  if (!verifyWebhook(rawBody, request.headers)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }

  let event: ResendReceivedEvent
  try {
    event = JSON.parse(rawBody) as ResendReceivedEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const emailId = event.data?.email_id?.trim()
  if (!emailId) {
    return NextResponse.json({ error: 'Missing received email ID.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Inbound mail storage is not configured.' }, { status: 503 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const received = await getReceivedEmail(emailId)
  if (!received) {
    return NextResponse.json({ error: 'Unable to retrieve received email.' }, { status: 502 })
  }

  const eventRecipients = received.to ?? event.data?.to ?? []
  const normalizedRecipients = eventRecipients.map((entry) => parseMailbox(entry).email)

  const { data: routeRows, error: routeError } = await admin
    .from('support_email_routes')
    .select('id, address, label, bucket, display_name, forward_to, forward_enabled, is_active, accepts_inbound')
    .in('address', normalizedRecipients)
    .eq('is_active', true)
    .eq('accepts_inbound', true)
    .limit(1)

  if (routeError) {
    console.error('Unable to route inbound RaiseHub email:', routeError)
    return NextResponse.json({ error: 'Unable to route inbound email.' }, { status: 500 })
  }

  const route = (routeRows?.[0] ?? null) as EmailRoute | null
  if (!route) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'No active inbound route.' })
  }

  const providerMessageId = received.message_id ?? event.data?.message_id ?? emailId
  const { data: existingMessage } = await admin
    .from('support_request_messages')
    .select('id')
    .eq('provider_message_id', providerMessageId)
    .maybeSingle()

  if (existingMessage) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  const sender = parseMailbox(received.from ?? event.data?.from)
  const subject = (received.subject ?? event.data?.subject ?? 'RaiseHub email').trim()
  const bodyText = (received.text ?? '').trim()
  const bodyHtml = received.html ?? null
  const message = bodyText || 'This email contains HTML content. Open the message thread to review it.'
  const inReplyTo = normalizeHeader(received.headers, 'in-reply-to')

  let supportRequestId: string | null = null

  if (inReplyTo) {
    const { data: matchedMessage } = await admin
      .from('support_request_messages')
      .select('support_request_id')
      .eq('provider_message_id', inReplyTo)
      .maybeSingle()

    supportRequestId = matchedMessage?.support_request_id ?? null
  }

  if (!supportRequestId) {
    const { data: requestRow, error: requestError } = await admin
      .from('support_requests')
      .insert({
        requester_user_id: null,
        requester_name: sender.name,
        requester_email: sender.email,
        topic: subject.slice(0, 200),
        message: message.slice(0, 10000),
        source_page: 'email',
        environment: 'production',
        status: 'open',
        channel: 'email',
        bucket: route.bucket,
        inbound_to: route.address,
        provider_message_id: providerMessageId,
        email_thread_id: normalizeHeader(received.headers, 'references') ?? inReplyTo,
        reply_from_email: route.address,
      })
      .select('id')
      .single()

    if (requestError || !requestRow) {
      console.error('Unable to create inbound support request:', requestError)
      return NextResponse.json({ error: 'Unable to store inbound email.' }, { status: 500 })
    }

    supportRequestId = requestRow.id
  } else {
    await admin
      .from('support_requests')
      .update({
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', supportRequestId)
  }

  if (!supportRequestId) {
    return NextResponse.json({ error: 'Unable to resolve support request.' }, { status: 500 })
  }

  const { error: messageError } = await admin
    .from('support_request_messages')
    .insert({
      support_request_id: supportRequestId,
      direction: 'inbound',
      sender_email: sender.email,
      recipient_emails: normalizedRecipients,
      subject,
      body_text: bodyText || null,
      body_html: bodyHtml,
      provider_message_id: providerMessageId,
      provider_in_reply_to: inReplyTo,
    })

  if (messageError) {
    console.error('Unable to store inbound support message:', messageError)
    return NextResponse.json({ error: 'Unable to store inbound message.' }, { status: 500 })
  }

  await notifyOwners({
    admin,
    route,
    senderEmail: sender.email,
    subject,
    supportRequestId,
    providerMessageId,
  })

  await forwardCopy({
    route,
    sender: received.from ?? sender.email,
    subject,
    body: message,
  })

  return NextResponse.json({
    ok: true,
    supportRequestId,
    bucket: route.bucket,
    forwarded: route.forward_enabled,
  })
}
