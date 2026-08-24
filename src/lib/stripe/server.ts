import 'server-only'

import Stripe from 'stripe'

const SIGNATURE_TOLERANCE_SECONDS = 300
const SENSITIVE_RETURN_PARAM_NAMES = new Set([
  'gift',
  'claim_token',
  'claimtoken',
  'token',
])

export type StripeCheckoutSessionInput = {
  attemptId: string
  amountCents: number
  currency: string
  customerEmail: string | null
  campaignName: string
  successUrl: string
  cancelUrl: string
}

function requireEnvironmentValue(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

function isStripeSecretKey(value: string) {
  return value.startsWith('sk_test_') || value.startsWith('sk_live_')
}

function requireSecretKey() {
  const key = requireEnvironmentValue('STRIPE_SECRET_KEY')

  if (!isStripeSecretKey(key)) {
    throw new Error('STRIPE_SECRET_KEY must be a Stripe test or live secret key')
  }

  return key
}

function secretKeyIsLive(key: string) {
  return key.startsWith('sk_live_')
}

function configuredWebhookSecrets() {
  return [
    process.env.STRIPE_WEBHOOK_SECRET?.trim(),
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim(),
  ].filter((secret): secret is string => Boolean(secret?.startsWith('whsec_')))
}

function stripSensitiveReturnParams(url: string) {
  const questionMarkIndex = url.indexOf('?')
  if (questionMarkIndex < 0) return url

  const base = url.slice(0, questionMarkIndex)
  const query = url.slice(questionMarkIndex + 1)
  const safeParams = query.split('&').filter((entry) => {
    const separatorIndex = entry.indexOf('=')
    const rawName = separatorIndex >= 0 ? entry.slice(0, separatorIndex) : entry
    const name = decodeURIComponent(rawName).toLowerCase()
    return !SENSITIVE_RETURN_PARAM_NAMES.has(name)
  })

  return safeParams.length > 0 ? `${base}?${safeParams.join('&')}` : base
}

export function stripeIsConfigured() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

  return Boolean(
    secretKey &&
      isStripeSecretKey(secretKey) &&
      webhookSecret?.startsWith('whsec_')
  )
}

export function getStripeClient() {
  return new Stripe(requireSecretKey(), {
    appInfo: {
      name: 'RaiseHub',
      version: '0.1.0',
    },
    maxNetworkRetries: 2,
    timeout: 20_000,
  })
}

export async function createStripeCheckoutSession(
  input: StripeCheckoutSessionInput
) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Stripe checkout amount must be a positive integer')
  }

  const stripe = getStripeClient()

  return stripe.checkout.sessions.create(
    {
      mode: 'payment',
      success_url: stripSensitiveReturnParams(input.successUrl),
      cancel_url: stripSensitiveReturnParams(input.cancelUrl),
      client_reference_id: input.attemptId,
      customer_email: input.customerEmail ?? undefined,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: {
        checkout_attempt_id: input.attemptId,
      },
      payment_intent_data: {
        metadata: {
          checkout_attempt_id: input.attemptId,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountCents,
            product_data: {
              name: `RaiseHub support — ${input.campaignName}`.slice(0, 120),
            },
          },
        },
      ],
    },
    {
      idempotencyKey: `raisehub-checkout-${input.attemptId}`,
    }
  )
}

export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null
) {
  if (!signatureHeader) {
    throw new Error('Missing Stripe-Signature header')
  }

  const webhookSecrets = configuredWebhookSecrets()

  if (webhookSecrets.length === 0) {
    throw new Error('No Stripe webhook signing secret is configured')
  }

  const key = requireSecretKey()
  const expectedLiveMode = secretKeyIsLive(key)
  const stripe = new Stripe(key, {
    appInfo: {
      name: 'RaiseHub',
      version: '0.1.0',
    },
    maxNetworkRetries: 2,
    timeout: 20_000,
  })
  let verificationError: unknown

  for (const webhookSecret of webhookSecrets) {
    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signatureHeader,
        webhookSecret,
        SIGNATURE_TOLERANCE_SECONDS
      )

      if (event.livemode !== expectedLiveMode) {
        throw new Error(
          `Stripe webhook mode mismatch: expected ${expectedLiveMode ? 'live' : 'test'} event`
        )
      }

      return event
    } catch (error) {
      verificationError = error
    }
  }

  throw verificationError instanceof Error
    ? verificationError
    : new Error('Stripe webhook signature verification failed')
}
