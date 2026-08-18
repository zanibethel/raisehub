import 'server-only'

import type Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe/server'

export const BUSINESS_BILLING_FLOW = 'business_subscription'

export type BusinessPlanCode = 'growth_monthly' | 'growth_annual'

export const BUSINESS_PLANS: Record<
  BusinessPlanCode,
  {
    label: string
    amountCents: number
    interval: 'month' | 'year'
  }
> = {
  growth_monthly: {
    label: 'RaiseHub Growth — Monthly',
    amountCents: 1199,
    interval: 'month',
  },
  growth_annual: {
    label: 'RaiseHub Growth — Annual',
    amountCents: 7499,
    interval: 'year',
  },
}

const GROWTH_ACCESS_STATUSES = new Set([
  'trialing',
  'active',
  'past_due',
])

export function isBusinessPlanCode(value: unknown): value is BusinessPlanCode {
  return value === 'growth_monthly' || value === 'growth_annual'
}

function expandableId(value: string | { id: string } | null | undefined) {
  if (typeof value === 'string') return value
  return value?.id ?? null
}

function unixSecondsToIso(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null
}

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const record = subscription as unknown as Record<string, unknown>
  return {
    start: unixSecondsToIso(record.current_period_start),
    end: unixSecondsToIso(record.current_period_end),
  }
}

function subscriptionPlanCode(subscription: Stripe.Subscription) {
  const raw = subscription.metadata?.raisehub_plan_code
  return isBusinessPlanCode(raw) ? raw : null
}

async function recordBillingEvent(
  admin: any,
  event: Stripe.Event,
  input: {
    businessId: string
    stripeObjectId?: string | null
    subscriptionStatus?: string | null
    amountDueCents?: number | null
    amountPaidCents?: number | null
    currency?: string | null
  }
) {
  const { error } = await admin.from('business_billing_events').upsert(
    {
      business_id: input.businessId,
      stripe_event_id: event.id,
      stripe_object_id: input.stripeObjectId ?? null,
      event_type: event.type,
      subscription_status: input.subscriptionStatus ?? null,
      amount_due_cents: input.amountDueCents ?? null,
      amount_paid_cents: input.amountPaidCents ?? null,
      currency: input.currency?.toLowerCase() ?? null,
      livemode: event.livemode,
      payload: event,
      processed_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_event_id' }
  )

  if (error) throw error
}

async function synchronizeSubscription(
  admin: any,
  event: Stripe.Event,
  subscription: Stripe.Subscription,
  fallbackBusinessId?: string | null
) {
  const businessId =
    subscription.metadata?.raisehub_business_id?.trim() ||
    fallbackBusinessId?.trim() ||
    null

  if (!businessId) {
    throw new Error('Business subscription is missing RaiseHub business metadata')
  }

  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('id, legacy_profile_id, is_demo, demo_group')
    .eq('id', businessId)
    .maybeSingle()

  if (businessError || !business) {
    throw new Error('Business subscription could not be matched to a workspace')
  }

  if (business.is_demo !== false || business.demo_group !== null) {
    throw new Error('Demo businesses cannot receive Stripe subscription state')
  }

  const planCode = subscriptionPlanCode(subscription)
  const customerId = expandableId(subscription.customer)
  const priceId = subscription.items.data[0]?.price?.id ?? null
  const period = subscriptionPeriod(subscription)
  const grantsGrowth = GROWTH_ACCESS_STATUSES.has(subscription.status)
  const tier = grantsGrowth ? 'growth' : 'free'
  const now = new Date().toISOString()

  const { error: billingError } = await admin.from('business_billing_accounts').upsert(
    {
      business_id: businessId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      livemode: Boolean((subscription as any).livemode),
      plan_code: planCode ?? (grantsGrowth ? 'growth' : 'free'),
      subscription_status: subscription.status,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      current_period_start: period.start,
      current_period_end: period.end,
      trial_end: unixSecondsToIso(subscription.trial_end),
      canceled_at: unixSecondsToIso(subscription.canceled_at),
      ended_at: unixSecondsToIso(subscription.ended_at),
      last_synced_at: now,
      updated_at: now,
    },
    { onConflict: 'business_id' }
  )

  if (billingError) throw billingError

  const { error: businessTierError } = await admin
    .from('businesses')
    .update({ subscription_tier: tier, updated_at: now })
    .eq('id', businessId)

  if (businessTierError) throw businessTierError

  if (business.legacy_profile_id) {
    const { error: profileTierError } = await admin
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', business.legacy_profile_id)

    if (profileTierError) throw profileTierError
  }

  await recordBillingEvent(admin, event, {
    businessId,
    stripeObjectId: subscription.id,
    subscriptionStatus: subscription.status,
  })
}

async function synchronizeSubscriptionCheckout(
  admin: any,
  event: Stripe.Event,
  session: Stripe.Checkout.Session
) {
  const businessId = session.metadata?.raisehub_business_id?.trim()
  const planCode = session.metadata?.raisehub_plan_code?.trim()

  if (!businessId || !isBusinessPlanCode(planCode)) {
    throw new Error('Business subscription checkout metadata is incomplete')
  }

  if (session.mode !== 'subscription') {
    throw new Error('Business upgrade checkout is not a subscription session')
  }

  const subscriptionId = expandableId(session.subscription)
  if (!subscriptionId?.startsWith('sub_')) {
    throw new Error('Business upgrade checkout has no Stripe subscription')
  }

  const stripe = getStripeClient()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await synchronizeSubscription(admin, event, subscription, businessId)
}

async function synchronizeInvoiceEvent(
  admin: any,
  event: Stripe.Event,
  invoice: Stripe.Invoice
) {
  const customerId = expandableId(invoice.customer)
  if (!customerId) return false

  const { data: billingAccount, error } = await admin
    .from('business_billing_accounts')
    .select('business_id, stripe_subscription_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error) throw error
  if (!billingAccount) return false

  await admin
    .from('business_billing_accounts')
    .update({
      last_invoice_status: invoice.status ?? event.type,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('business_id', billingAccount.business_id)

  await recordBillingEvent(admin, event, {
    businessId: billingAccount.business_id,
    stripeObjectId: invoice.id,
    amountDueCents: invoice.amount_due,
    amountPaidCents: invoice.amount_paid,
    currency: invoice.currency,
  })

  if (billingAccount.stripe_subscription_id?.startsWith('sub_')) {
    const stripe = getStripeClient()
    const subscription = await stripe.subscriptions.retrieve(
      billingAccount.stripe_subscription_id
    )
    await synchronizeSubscription(admin, event, subscription, billingAccount.business_id)
  }

  return true
}

export async function handleBusinessBillingEvent(
  admin: any,
  event: Stripe.Event
): Promise<boolean> {
  if (
    (event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded') &&
    (event.data.object as Stripe.Checkout.Session).metadata?.raisehub_flow ===
      BUSINESS_BILLING_FLOW
  ) {
    await synchronizeSubscriptionCheckout(
      admin,
      event,
      event.data.object as Stripe.Checkout.Session
    )
    return true
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    if (!subscription.metadata?.raisehub_business_id) return false
    await synchronizeSubscription(admin, event, subscription)
    return true
  }

  if (
    event.type === 'invoice.paid' ||
    event.type === 'invoice.payment_failed' ||
    event.type === 'invoice.payment_action_required'
  ) {
    return synchronizeInvoiceEvent(
      admin,
      event,
      event.data.object as Stripe.Invoice
    )
  }

  return false
}
