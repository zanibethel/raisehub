import 'server-only'

import Stripe from 'stripe'

const SIGNATURE_TOLERANCE_SECONDS = 300

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

function requireTestSecretKey() {
  const key = requireEnvironmentValue('STRIPE_SECRET_KEY')

  if (!key.startsWith('sk_test_')) {
    throw new Error('Stripe must remain in test mode during this sprint')
  }

  return key
}

export function stripeIsConfigured() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

  return Boolean(
    secretKey?.startsWith('sk_test_') && webhookSecret?.startsWith('whsec_')
  )
}

export function getStripeClient() {
  return new Stripe(requireTestSecretKey(), {
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
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
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

  const webhookSecret = requireEnvironmentValue('STRIPE_WEBHOOK_SECRET')
  const stripe = getStripeClient()

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signatureHeader,
    webhookSecret,
    SIGNATURE_TOLERANCE_SECONDS
  )

  if (event.livemode) {
    throw new Error('Live-mode Stripe events are disabled during this sprint')
  }

  return event
}
