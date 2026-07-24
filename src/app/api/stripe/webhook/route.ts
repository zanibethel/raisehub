import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { createAdminClient } from '@/lib/supabase/admin'
import { verifyStripeWebhook } from '@/lib/stripe/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isFulfillmentEvent(event: Stripe.Event) {
  return (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  )
}

function paymentIntentId(
  value: Stripe.Checkout.Session['payment_intent']
) {
  if (typeof value === 'string') return value
  return value?.id ?? null
}

function connectOnboardingStatus(account: Stripe.Account) {
  if (account.charges_enabled && account.payouts_enabled) return 'enabled'
  if (account.requirements?.disabled_reason) return 'restricted'
  if (account.details_submitted) return 'in_progress'
  return 'not_started'
}

async function markWebhookEvent(
  admin: any,
  eventId: string,
  processingStatus: 'processed' | 'ignored' | 'failed',
  lastError: string | null = null
) {
  await admin
    .from('stripe_webhook_events')
    .update({
      processing_status: processingStatus,
      processed_at: processingStatus === 'failed' ? null : new Date().toISOString(),
      last_error: lastError,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_event_id', eventId)
}

async function synchronizeConnectedAccount(
  admin: any,
  event: Stripe.Event
) {
  const account = event.data.object as Stripe.Account

  if (!account.id?.startsWith('acct_')) {
    throw new Error('Stripe connected account ID is missing')
  }

  const { data: existingAccount, error: lookupError } = await admin
    .from('organization_stripe_accounts')
    .select('organization_id')
    .eq('stripe_account_id', account.id)
    .maybeSingle()

  if (lookupError || !existingAccount) {
    throw new Error('Stripe connected account could not be matched')
  }

  const { error: updateError } = await admin
    .from('organization_stripe_accounts')
    .update({
      onboarding_status: connectOnboardingStatus(account),
      details_submitted: Boolean(account.details_submitted),
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      requirements_currently_due: account.requirements?.currently_due ?? [],
      requirements_eventually_due: account.requirements?.eventually_due ?? [],
      requirements_past_due: account.requirements?.past_due ?? [],
      disabled_reason: account.requirements?.disabled_reason ?? null,
      country: account.country ?? null,
      default_currency: account.default_currency ?? null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id)

  if (updateError) throw updateError
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  let event: Stripe.Event

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
    .select('processing_status, attempt_count')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (
    existingEvent?.processing_status === 'processed' ||
    existingEvent?.processing_status === 'ignored'
  ) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  const attemptCount = Number(existingEvent?.attempt_count ?? 0) + 1
  const { error: eventInsertError } = await admin
    .from('stripe_webhook_events')
    .upsert(
      {
        stripe_event_id: event.id,
        event_type: event.type,
        livemode: event.livemode,
        payload: event,
        processing_status: 'processing',
        attempt_count: attemptCount,
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

  try {
    if (event.type === 'account.updated') {
      await synchronizeConnectedAccount(admin, event)
      await markWebhookEvent(admin, event.id, 'processed')
      return NextResponse.json({ received: true })
    }

    if (!isFulfillmentEvent(event)) {
      await markWebhookEvent(admin, event.id, 'ignored')
      return NextResponse.json({ received: true, ignored: true })
    }

    const session = event.data.object as Stripe.Checkout.Session
    const attemptId = session.metadata?.checkout_attempt_id?.trim()

    if (!attemptId) {
      throw new Error('Checkout attempt metadata is missing')
    }

    if (!session.id) {
      throw new Error('Checkout Session ID is missing')
    }

    const { data: attempt, error: attemptLookupError } = await admin
      .from('checkout_attempts')
      .select('id, stripe_checkout_session_id')
      .eq('id', attemptId)
      .maybeSingle()

    if (attemptLookupError || !attempt) {
      throw new Error('Checkout attempt could not be matched')
    }

    if (attempt.stripe_checkout_session_id !== session.id) {
      throw new Error('Checkout Session does not match the stored attempt')
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

    if (fulfillmentError) throw fulfillmentError

    await markWebhookEvent(admin, event.id, 'processed')
    return NextResponse.json({ received: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown webhook error'

    console.error('Stripe webhook processing failed', error)
    await markWebhookEvent(
      admin,
      event.id,
      'failed',
      message.slice(0, 1000)
    )

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
