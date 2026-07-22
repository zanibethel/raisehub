import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  verifyStripeWebhook,
  type StripeWebhookEvent,
} from '@/lib/stripe/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CheckoutSessionObject = {
  id?: string
  payment_intent?: string | { id?: string } | null
  amount_total?: number | null
  currency?: string | null
  payment_status?: string | null
}

function paymentIntentId(
  value: CheckoutSessionObject['payment_intent']
) {
  if (typeof value === 'string') return value
  return value?.id ?? null
}

function isFulfillmentEvent(event: StripeWebhookEvent) {
  return (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  )
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  let event: StripeWebhookEvent

  try {
    event = verifyStripeWebhook(
      rawBody,
      request.headers.get('stripe-signature')
    )
  } catch (error) {
    console.error('Stripe webhook verification failed', error)

    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  const admin = createAdminClient() as any
  const { data: existingEvent } = await admin
    .from('stripe_webhook_events')
    .select('processing_status')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existingEvent?.processing_status === 'processed' ||
      existingEvent?.processing_status === 'ignored') {
    return NextResponse.json({ received: true, duplicate: true })
  }

  const { error: eventInsertError } = await admin
    .from('stripe_webhook_events')
    .upsert(
      {
        stripe_event_id: event.id,
        event_type: event.type,
        livemode: event.livemode,
        payload: event,
        processing_status: 'processing',
        attempt_count: 1,
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_event_id' }
    )

  if (eventInsertError) {
    console.error('Could not record Stripe webhook event', eventInsertError)

    return NextResponse.json(
      { error: 'Webhook event could not be recorded' },
      { status: 500 }
    )
  }

  if (!isFulfillmentEvent(event)) {
    await admin
      .from('stripe_webhook_events')
      .update({
        processing_status: 'ignored',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id)

    return NextResponse.json({ received: true, ignored: true })
  }

  const session = event.data.object as CheckoutSessionObject

  try {
    if (!session.id) {
      throw new Error('Checkout Session ID is missing')
    }

    const { error: fulfillmentError } = await admin.rpc(
      'fulfill_paid_checkout_attempt',
      {
        p_stripe_checkout_session_id: session.id,
        p_stripe_payment_intent_id: paymentIntentId(
          session.payment_intent
        ),
        p_amount_total_cents: session.amount_total,
        p_currency: session.currency,
        p_payment_status: session.payment_status,
      }
    )

    if (fulfillmentError) {
      throw fulfillmentError
    }

    await admin
      .from('stripe_webhook_events')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id)

    return NextResponse.json({ received: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown webhook error'

    console.error('Stripe webhook fulfillment failed', error)

    await admin
      .from('stripe_webhook_events')
      .update({
        processing_status: 'failed',
        last_error: message.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id)

    return NextResponse.json(
      { error: 'Webhook fulfillment failed' },
      { status: 500 }
    )
  }
}
