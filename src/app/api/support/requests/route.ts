import { NextResponse } from 'next/server'

import { isDemoMode } from '@/lib/app-mode'
import { buildPublicRateLimitSubject } from '@/lib/security/request-identity'
import { consumeRateLimit } from '@/lib/security/rate-limit'
import { createClient } from '@/lib/supabase/server'

type SupportRequestBody = {
  name?: unknown
  email?: unknown
  topic?: unknown
  message?: unknown
  pageUrl?: unknown
}

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: Request) {
  let body: SupportRequestBody

  try {
    body = (await request.json()) as SupportRequestBody
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 })
  }

  const name = text(body.name, 120)
  const email = text(body.email, 254).toLowerCase()
  const topic = text(body.topic, 80)
  const message = text(body.message, 4000)
  const pageUrl = text(body.pageUrl, 1000)

  if (!name || !isValidEmail(email) || !topic || message.length < 10) {
    return NextResponse.json(
      { error: 'Please complete every field with a valid email and a detailed message.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    const decision = await consumeRateLimit({
      scope: isDemoMode() ? 'support_request:create:demo' : 'support_request:create:live',
      subject: user?.id
        ? `user:${user.id}`
        : buildPublicRateLimitSubject({ request, discriminator: email }),
      limit: 5,
      windowSeconds: 15 * 60,
    })

    if (!decision.allowed) {
      return NextResponse.json(
        { error: 'Too many support requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.max(decision.retryAfterSeconds, 1)) },
        }
      )
    }
  } catch (error) {
    console.error('Unable to confirm support-request rate limit:', error)
    return NextResponse.json(
      { error: 'RaiseHub Support is temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  const { error } = await supabase.from('support_requests').insert({
    requester_user_id: user?.id ?? null,
    requester_name: name,
    requester_email: email,
    topic,
    message,
    source_page: pageUrl || null,
    environment: isDemoMode() ? 'demo' : 'production',
    status: 'open',
  })

  if (error) {
    console.error('Unable to create support request:', error)
    return NextResponse.json(
      { error: 'RaiseHub Support could not receive your message. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
