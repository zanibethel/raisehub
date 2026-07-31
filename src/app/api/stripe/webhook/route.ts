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

function isTerminalCheckoutEvent(event: Stripe.Event) {
  return (
    event.type === 'checkout.session.expired' ||
    event.type === 'checkout.session.async_payment_failed'
  )
}

function isPaymentReconciliationEvent(event: Stripe.Event) {
  return (
    event.type === 'charge.refunded' ||
    event.type === 'charge.dispute.created' ||
    event.type === 'charge.dispute.updated' ||
    event.type === 'charge.dispute.closed'
  )
}

function expandableId(value: string | { id: string } | null | undefined) {
  if (typeof value === 'string') return value
  return value?.id ?? null
}

function paymentIntentId(
  value: Stripe.Checkout.Session['payment_intent']
) {
  return expandableId(value)
}

function connectOnboardingStatus(account: Stripe.Account) {
  if (account.charges_enabled && account.payouts_enabled) return 'enabled'
  if (account.requirements?.disabled_reason) return 'restricted'
  if (account.details_submitted) return 'in_progress'
  return 'not_started'
}

function assertProductionRecord(
  record: { is_demo?: boolean | null; demo_group?: string | null } | null,
  label: string
) {
  if (!record || record.is_demo !== false || record.demo_group !== null) {
    throw new Error(`${label} is not a valid production record`)
  }
}

async function validateProductionCheckoutAttempt(
  admin: any,
  attemptId: string,
  checkoutSessionId: string
) {
  const { data: attempt, error: attemptError } = await admin
    .from('checkout_attempts')
    .select(
      'id, user_id, campaign_id, selected_organization_id, organization_workspace_id, campaign_seller_id, stripe_checkout_session_id, status, purchase_id, fulfilled_at, is_demo, demo_group'
    )
    .eq('id', attemptId)
    .maybeSingle()

  if (attemptError || !attempt) {
    throw new Error('Checkout attempt could not be matched')
  }

  if (attempt.stripe_checkout_session_id !== checkoutSessionId) {
    throw new Error('Checkout Session does not match the stored attempt')
  }

  assertProductionRecord(attempt, 'Checkout attempt')

  if (!attempt.user_id || !attempt.campaign_id) {
    throw new Error('Checkout attempt ownership is incomplete')
  }

  if (
    !attempt.selected_organization_id ||
    !attempt.organization_workspace_id
  ) {
    throw new Error('Checkout attempt organization ownership is incomplete')
  }

  const [
    userResult,
    campaignResult,
    organizationProfileResult,
    organizationWorkspaceResult,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, is_demo, demo_group')
      .eq('id', attempt.user_id)
      .maybeSingle(),
    admin
      .from('campaigns')
      .select('id, organization_id, is_demo, demo_group')
      .eq('id', attempt.campaign_id)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('id, role, is_demo, demo_group')
      .eq('id', attempt.selected_organization_id)
      .eq('role', 'organization')
      .maybeSingle(),
    admin
      .from('organizations')
      .select('id, legacy_profile_id, status, archived_at, is_demo, demo_group')
      .eq('id', attempt.organization_workspace_id)
      .maybeSingle(),
  ])

  if (
    userResult.error ||
    campaignResult.error ||
    organizationProfileResult.error ||
    organizationWorkspaceResult.error
  ) {
    throw new Error('Checkout environment validation failed')
  }

  const userProfile = userResult.data
  const campaign = campaignResult.data
  const organizationProfile = organizationProfileResult.data
  const organizationWorkspace = organizationWorkspaceResult.data

  assertProductionRecord(userProfile, 'Customer profile')
  assertProductionRecord(campaign, 'Campaign')
  assertProductionRecord(organizationProfile, 'Organization profile')
  assertProductionRecord(organizationWorkspace, 'Organization workspace')

  if (campaign.organization_id !== attempt.selected_organization_id) {
    throw new Error('Campaign organization does not match checkout attempt')
  }

  if (
    organizationWorkspace.legacy_profile_id !==
    attempt.selected_organization_id
  ) {
    throw new Error('Canonical organization does not match checkout attempt')
  }

  if (
    organizationWorkspace.status !== 'active' ||
    organizationWorkspace.archived_at !== null
  ) {
    throw new Error('Canonical organization is not active')
  }

  if (attempt.campaign_seller_id) {
    const { data: seller, error: sellerError } = await admin
      .from('campaign_sellers')
      .select('id, campaign_id, organization_id, status')
      .eq('id', attempt.campaign_seller_id)
      .maybeSingle()

    if (
      sellerError ||
      !seller ||
      seller.status !== 'active' ||
      seller.campaign_id !== attempt.campaign_id ||
      seller.organization_id !== attempt.organization_workspace_id
    ) {
      throw new Error('Managed seller does not match checkout ownership')
    }
  }

  return attempt
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

async function synchronizeTerminalCheckoutAttempt(
  admin: any,
  event: Stripe.Event
) {
  const session = event.data.object as Stripe.Checkout.Session
  const attemptId = session.metadata?.checkout_attempt_id?.trim()

  if (!attemptId) throw new Error('Checkout attempt metadata is missing')
  if (!session.id) throw new Error('Checkout Session ID is missing')

  const { data: attempt, error: lookupError } = await admin
    .from('checkout_attempts')
    .select('id, status, stripe_checkout_session_id, purchase_id, fulfilled_at')
    .eq('id', attemptId)
    .maybeSingle()

  if (lookupError || !attempt) {
    throw new Error('Checkout attempt could not be matched')
  }

  if (attempt.stripe_checkout_session_id !== session.id) {
    throw new Error('Checkout Session does not match the stored attempt')
  }

  if (attempt.status === 'paid' || attempt.purchase_id || attempt.fulfilled_at) {
    return
  }

  const nextStatus =
    event.type === 'checkout.session.expired' ? 'expired' : 'failed'

  if (attempt.status === nextStatus) return
  if (attempt.status !== 'created' && attempt.status !== 'open') return

  const timestamp = new Date().toISOString()
  const { error: updateError } = await admin
    .from('checkout_attempts')
    .update({
      status: nextStatus,
      failed_at: nextStatus === 'failed' ? timestamp : null,
      updated_at: timestamp,
    })
    .eq('id', attempt.id)
    .eq('stripe_checkout_session_id', session.id)
    .in('status', ['created', 'open'])
    .is('purchase_id', null)
    .is('fulfilled_at', null)

  if (updateError) throw updateError
}

async function reconcilePaymentLoss(admin: any, event: Stripe.Event) {
  let paymentIntent: string | null = null
  let chargeId: string | null = null
  let refundId: string | null = null
  let disputeId: string | null = null
  let amountCents = 0
  let currency = 'usd'
  let disputeStatus: string | null = null

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    paymentIntent = expandableId(charge.payment_intent)
    chargeId = charge.id
    refundId = charge.refunds?.data.at(-1)?.id ?? null
    amountCents = charge.amount_refunded
    currency = charge.currency
  } else {
    const dispute = event.data.object as Stripe.Dispute
    paymentIntent = expandableId(dispute.payment_intent)
    chargeId = expandableId(dispute.charge)
    disputeId = dispute.id
    amountCents = dispute.amount
    currency = dispute.currency
    disputeStatus = dispute.status
  }

  if (!paymentIntent?.startsWith('pi_')) {
    throw new Error('Stripe payment intent could not be resolved for reconciliation')
  }

  const { error } = await admin.rpc('reconcile_purchase_payment_event', {
    p_stripe_event_id: event.id,
    p_event_type: event.type,
    p_stripe_payment_intent_id: paymentIntent,
    p_stripe_charge_id: chargeId,
    p_stripe_refund_id: refundId,
    p_stripe_dispute_id: disputeId,
    p_amount_cents: amountCents,
    p_currency: currency,
    p_dispute_status: disputeStatus,
  })

  if (error) throw error
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

    if (isTerminalCheckoutEvent(event)) {
      await synchronizeTerminalCheckoutAttempt(admin, event)
      await markWebhookEvent(admin, event.id, 'processed')
      return NextResponse.json({ received: true })
    }

    if (isPaymentReconciliationEvent(event)) {
      await reconcilePaymentLoss(admin, event)
      await markWebhookEvent(admin, event.id, 'processed')
      return NextResponse.json({ received: true })
    }

    if (!isFulfillmentEvent(event)) {
      await markWebhookEvent(admin, event.id, 'ignored')
      return NextResponse.json({ received: true, ignored: true })
    }

    const session = event.data.object as Stripe.Checkout.Session
    const attemptId = session.metadata?.checkout_attempt_id?.trim()

    if (!attemptId) throw new Error('Checkout attempt metadata is missing')
    if (!session.id) throw new Error('Checkout Session ID is missing')

    await validateProductionCheckoutAttempt(admin, attemptId, session.id)

    const { error: fulfillmentError } = await admin.rpc(
      'fulfill_paid_checkout_attempt',
      {
        p_stripe_checkout_session_id: session.id,
        p_stripe_payment_intent_id: paymentIntentId(session.payment_intent),
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
