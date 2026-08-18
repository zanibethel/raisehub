import 'server-only'

import type Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe/server'

const GROWTH_ACCESS_STATUSES = new Set(['trialing', 'active', 'past_due'])

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
  const subscriptionRecord = subscription as unknown as Record<string, unknown>
  const itemRecord = (subscription.items.data[0] ?? {}) as unknown as Record<
    string,
    unknown
  >

  return {
    start: unixSecondsToIso(
      subscriptionRecord.current_period_start ?? itemRecord.current_period_start
    ),
    end: unixSecondsToIso(
      subscriptionRecord.current_period_end ?? itemRecord.current_period_end
    ),
  }
}

export async function refreshBusinessBillingFromStripe(
  admin: any,
  businessId: string
) {
  const { data: billingAccount, error: billingError } = await admin
    .from('business_billing_accounts')
    .select('stripe_subscription_id')
    .eq('business_id', businessId)
    .maybeSingle()

  if (billingError) throw billingError
  if (!billingAccount?.stripe_subscription_id?.startsWith('sub_')) return false

  const stripe = getStripeClient()
  const subscription = await stripe.subscriptions.retrieve(
    billingAccount.stripe_subscription_id
  )

  const metadataBusinessId = subscription.metadata?.raisehub_business_id?.trim()
  if (metadataBusinessId && metadataBusinessId !== businessId) {
    throw new Error('Stripe subscription does not belong to this Business workspace')
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

  const period = subscriptionPeriod(subscription)
  const grantsGrowth = GROWTH_ACCESS_STATUSES.has(subscription.status)
  const tier = grantsGrowth ? 'growth' : 'free'
  const now = new Date().toISOString()
  const customerId = expandableId(subscription.customer)
  const priceId = subscription.items.data[0]?.price?.id ?? null
  const planCode = subscription.metadata?.raisehub_plan_code?.trim() ||
    (grantsGrowth ? 'growth' : 'free')

  const { error: accountUpdateError } = await admin
    .from('business_billing_accounts')
    .update({
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      livemode: Boolean((subscription as any).livemode),
      plan_code: planCode,
      subscription_status: subscription.status,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      current_period_start: period.start,
      current_period_end: period.end,
      trial_end: unixSecondsToIso(subscription.trial_end),
      canceled_at: unixSecondsToIso(subscription.canceled_at),
      ended_at: unixSecondsToIso(subscription.ended_at),
      last_synced_at: now,
      updated_at: now,
    })
    .eq('business_id', businessId)

  if (accountUpdateError) throw accountUpdateError

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

  return true
}
