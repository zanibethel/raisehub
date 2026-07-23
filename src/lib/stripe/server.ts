import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

const STRIPE_API_BASE = 'https://api.stripe.com/v1'
const SIGNATURE_TOLERANCE_SECONDS = 300

type StripeCheckoutSessionInput = {
  attemptId: string
  amountCents: number
  currency: string
  customerEmail: string | null
  campaignName: string
  successUrl: string
  cancelUrl: string
}

export type StripeCheckoutSession = {
  id: string
  url: string | null
  expires_at: number | null
}

export type StripeWebhookEvent = {
  id: string
  type: string
  livemode: boolean
  data: {
    object: Record<string, unknown>
  }
}

function requireEnvironmentValue(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

export function stripeIsConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim()
  )
}

export async function createStripeCheckoutSession(
  input: StripeCheckoutSessionInput
): Promise<StripeCheckoutSession> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Stripe checkout amount must be a positive integer')
  }

  const secretKey = requireEnvironmentValue('STRIPE_SECRET_KEY')
  const body = new URLSearchParams()

  body.set('mode', 'payment')
  body.set('success_url', input.successUrl)
  body.set('cancel_url', input.cancelUrl)
  body.set('client_reference_id', input.attemptId)
  body.set('metadata[checkout_attempt_id]', input.attemptId)
  body.set('payment_intent_data[metadata][checkout_attempt_id]', input.attemptId)
  body.set('line_items[0][quantity]', '1')
  body.set('line_items[0][price_data][currency]', input.currency)
  body.set('line_items[0][price_data][unit_amount]', String(input.amountCents))
  body.set(
    'line_items[0][price_data][product_data][name]',
    `RaiseHub support — ${input.campaignName}`.slice(0, 120)
  )
  body.set('expires_at', String(Math.floor(Date.now() / 1000) + 30 * 60))

  if (input.customerEmail) {
    body.set('customer_email', input.customerEmail)
  }

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  })

  const payload = (await response.json()) as
    | StripeCheckoutSession
    | { error?: { message?: string } }

  if (!response.ok || !('id' in payload)) {
    const message =
      'error' in payload
        ? payload.error?.message
        : null

    throw new Error(message || 'Stripe Checkout Session creation failed')
  }

  return payload
}

function parseStripeSignatureHeader(header: string) {
  const values = new Map<string, string[]>()

  for (const part of header.split(',')) {
    const [key, value] = part.trim().split('=', 2)

    if (!key || !value) continue

    values.set(key, [...(values.get(key) ?? []), value])
  }

  return {
    timestamp: values.get('t')?.[0] ?? null,
    signatures: values.get('v1') ?? [],
  }
}

export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null
): StripeWebhookEvent {
  if (!signatureHeader) {
    throw new Error('Missing Stripe-Signature header')
  }

  const webhookSecret = requireEnvironmentValue('STRIPE_WEBHOOK_SECRET')
  const parsed = parseStripeSignatureHeader(signatureHeader)
  const timestamp = Number(parsed.timestamp)

  if (!Number.isFinite(timestamp) || parsed.signatures.length === 0) {
    throw new Error('Invalid Stripe signature header')
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp)

  if (age > SIGNATURE_TOLERANCE_SECONDS) {
    throw new Error('Stripe webhook timestamp is outside the tolerance window')
  }

  const expected = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex')

  const expectedBuffer = Buffer.from(expected, 'hex')
  const matches = parsed.signatures.some((signature) => {
    try {
      const suppliedBuffer = Buffer.from(signature, 'hex')

      return (
        suppliedBuffer.length === expectedBuffer.length &&
        timingSafeEqual(suppliedBuffer, expectedBuffer)
      )
    } catch {
      return false
    }
  })

  if (!matches) {
    throw new Error('Stripe webhook signature verification failed')
  }

  const event = JSON.parse(rawBody) as StripeWebhookEvent

  if (!event.id || !event.type || !event.data?.object) {
    throw new Error('Stripe webhook payload is incomplete')
  }

  return event
}
