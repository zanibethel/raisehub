import 'server-only'

import type Stripe from 'stripe'

import { getStripeClient, stripeIsConfigured } from '@/lib/stripe/server'
import type { EventPromotionStripeMode } from '@/lib/types/event-promotion'

export const EVENT_PROMOTION_FLOW = 'event_promotion'

type CheckoutInput = {
  purchaseId: string
  businessId: string
  eventId: string
  eventTitle: string
  durationDays: number
  amountCents: number
  currency: string
  customerEmail: string | null
  successUrl: string
  cancelUrl: string
}

function configuredSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? ''
}

export function getEventPromotionStripeMode(): Exclude<
  EventPromotionStripeMode,
  'demo'
> {
  if (!stripeIsConfigured()) return 'unconfigured'

  const secretKey = configuredSecretKey()
  if (secretKey.startsWith('sk_test_')) return 'test'
  if (!secretKey.startsWith('sk_live_')) return 'unconfigured'

  return process.env.EVENT_PROMOTION_LIVE_PAYMENTS_ENABLED?.trim() === 'true'
    ? 'live'
    : 'live-disabled'
}

export async function createEventPromotionCheckoutSession(
  input: CheckoutInput
) {
  const mode = getEventPromotionStripeMode()

  if (mode === 'unconfigured') {
    throw new Error('Stripe Checkout is not configured for Event Promotion.')
  }

  if (mode === 'live-disabled') {
    throw new Error(
      'Live Event Promotion charging is disabled until Stripe live mode is verified.'
    )
  }

  const stripe = getStripeClient()
  const integrationSuffix = input.purchaseId.replaceAll('-', '').slice(0, 8)

  return stripe.checkout.sessions.create(
    {
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.purchaseId,
      customer_email: input.customerEmail ?? undefined,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      integration_identifier: `raisehub_event_promo_${integrationSuffix}`,
      metadata: {
        raisehub_flow: EVENT_PROMOTION_FLOW,
        event_promotion_purchase_id: input.purchaseId,
        raisehub_business_id: input.businessId,
        raisehub_event_id: input.eventId,
        duration_days: String(input.durationDays),
      },
      payment_intent_data: {
        metadata: {
          raisehub_flow: EVENT_PROMOTION_FLOW,
          event_promotion_purchase_id: input.purchaseId,
          raisehub_business_id: input.businessId,
          raisehub_event_id: input.eventId,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountCents,
            product_data: {
              name: `RaiseHub Event Promotion — ${input.eventTitle}`.slice(
                0,
                120
              ),
            },
          },
        },
      ],
    },
    {
      idempotencyKey: `raisehub-event-promotion-${input.purchaseId}`,
    }
  )
}

function paymentIntentId(
  value: Stripe.Checkout.Session['payment_intent']
) {
  if (typeof value === 'string') return value
  return value?.id ?? null
}

function eventPromotionPurchaseId(session: Stripe.Checkout.Session) {
  return session.metadata?.event_promotion_purchase_id?.trim() || null
}

function isEventPromotionSession(session: Stripe.Checkout.Session) {
  return session.metadata?.raisehub_flow === EVENT_PROMOTION_FLOW
}

async function markTerminalPurchase(
  admin: any,
  event: Stripe.Event,
  session: Stripe.Checkout.Session
) {
  const purchaseId = eventPromotionPurchaseId(session)
  if (!purchaseId || !session.id) {
    throw new Error('Event Promotion Checkout metadata is incomplete.')
  }

  const nextStatus =
    event.type === 'checkout.session.expired' ? 'expired' : 'failed'
  const timestamp = new Date().toISOString()

  const { error } = await admin
    .from('event_promotion_purchases')
    .update({
      status: nextStatus,
      failed_at: nextStatus === 'failed' ? timestamp : null,
      failure_message:
        nextStatus === 'failed'
          ? 'Stripe reported that the asynchronous payment failed.'
          : null,
      updated_at: timestamp,
    })
    .eq('id', purchaseId)
    .eq('stripe_checkout_session_id', session.id)
    .in('status', ['created', 'open'])
    .is('fulfilled_at', null)

  if (error) throw error
}

export async function handleEventPromotionStripeEvent(
  admin: any,
  event: Stripe.Event
): Promise<boolean> {
  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded' &&
    event.type !== 'checkout.session.async_payment_failed' &&
    event.type !== 'checkout.session.expired'
  ) {
    return false
  }

  const session = event.data.object as Stripe.Checkout.Session
  if (!isEventPromotionSession(session)) return false

  if (
    event.type === 'checkout.session.async_payment_failed' ||
    event.type === 'checkout.session.expired'
  ) {
    await markTerminalPurchase(admin, event, session)
    return true
  }

  const purchaseId = eventPromotionPurchaseId(session)
  if (!purchaseId || !session.id) {
    throw new Error('Event Promotion Checkout metadata is incomplete.')
  }

  if (
    event.type === 'checkout.session.completed' &&
    session.payment_status !== 'paid' &&
    session.payment_status !== 'no_payment_required'
  ) {
    return true
  }

  const { error } = await admin.rpc(
    'fulfill_paid_event_promotion_purchase',
    {
      p_purchase_id: purchaseId,
      p_stripe_checkout_session_id: session.id,
      p_stripe_payment_intent_id: paymentIntentId(session.payment_intent),
      p_amount_total_cents: session.amount_total,
      p_currency: session.currency,
      p_payment_status: session.payment_status,
      p_stripe_livemode: event.livemode,
    }
  )

  if (error) throw error
  return true
}
