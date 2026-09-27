import type Stripe from 'stripe'

import {
  WEBPORTAL_AD_FLOW,
  WEBPORTAL_SUPPORT_FLOW,
} from '@/lib/webportal/commerce'

function expandableId(value: string | { id: string } | null | undefined) {
  if (typeof value === 'string') return value
  return value?.id ?? null
}

function sessionFlow(session: Stripe.Checkout.Session) {
  return session.metadata?.raisehub_flow?.trim() ?? ''
}

function orderIdFromMetadata(metadata: Stripe.Metadata | null | undefined) {
  return metadata?.webportal_ad_order_id?.trim() ?? ''
}

async function handleSupportCheckout(admin: any, event: Stripe.Event) {
  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded' &&
    event.type !== 'checkout.session.async_payment_failed' &&
    event.type !== 'checkout.session.expired'
  ) {
    return false
  }

  const session = event.data.object as Stripe.Checkout.Session
  if (sessionFlow(session) !== WEBPORTAL_SUPPORT_FLOW) return false

  if (
    event.type === 'checkout.session.expired' ||
    event.type === 'checkout.session.async_payment_failed'
  ) {
    return true
  }

  if (session.payment_status !== 'paid') {
    return true
  }

  const amountCents = Number(session.amount_total ?? 0)
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('WebPortal support amount is invalid')
  }

  const now = new Date().toISOString()
  const { error } = await admin
    .from('webportal_support_payments')
    .upsert(
      {
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: expandableId(session.payment_intent),
        contact_email:
          session.customer_details?.email ?? session.customer_email ?? null,
        amount_cents: amountCents,
        currency: session.currency ?? 'usd',
        payment_status: session.payment_status,
        paid_at: now,
        updated_at: now,
      },
      { onConflict: 'stripe_checkout_session_id' }
    )

  if (error) throw error
  return true
}

async function handleAdCheckout(admin: any, event: Stripe.Event) {
  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded' &&
    event.type !== 'checkout.session.async_payment_failed' &&
    event.type !== 'checkout.session.expired'
  ) {
    return false
  }

  const session = event.data.object as Stripe.Checkout.Session
  if (sessionFlow(session) !== WEBPORTAL_AD_FLOW) return false

  const orderId = orderIdFromMetadata(session.metadata)
  if (!orderId) throw new Error('WebPortal ad order metadata is missing')

  const now = new Date().toISOString()

  if (event.type === 'checkout.session.expired') {
    const { error } = await admin
      .from('webportal_ad_orders')
      .update({
        status: 'checkout_expired',
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('stripe_checkout_session_id', session.id)
      .eq('status', 'checkout_open')

    if (error) throw error
    return true
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    const { error } = await admin
      .from('webportal_ad_orders')
      .update({
        status: 'checkout_failed',
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('stripe_checkout_session_id', session.id)
      .eq('status', 'checkout_open')

    if (error) throw error
    return true
  }

  if (session.payment_status !== 'paid') {
    return true
  }

  const { error } = await admin
    .from('webportal_ad_orders')
    .update({
      status: 'paid_pending_review',
      stripe_customer_id: expandableId(session.customer),
      stripe_payment_intent_id: expandableId(session.payment_intent),
      stripe_subscription_id: expandableId(session.subscription),
      subscription_status:
        session.mode === 'subscription' ? 'active' : null,
      purchased_at: now,
      updated_at: now,
    })
    .eq('id', orderId)
    .eq('stripe_checkout_session_id', session.id)
    .in('status', ['checkout_open', 'checkout_failed'])

  if (error) throw error
  return true
}

async function handleAdSubscription(admin: any, event: Stripe.Event) {
  if (
    event.type !== 'customer.subscription.created' &&
    event.type !== 'customer.subscription.updated' &&
    event.type !== 'customer.subscription.deleted'
  ) {
    return false
  }

  const subscription = event.data.object as Stripe.Subscription
  if (subscription.metadata?.raisehub_flow !== WEBPORTAL_AD_FLOW) return false

  const orderId = orderIdFromMetadata(subscription.metadata)
  if (!orderId) throw new Error('WebPortal ad subscription order metadata is missing')

  const now = new Date().toISOString()
  const customerId = expandableId(subscription.customer)

  const update: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    subscription_status: subscription.status,
    updated_at: now,
  }

  if (event.type === 'customer.subscription.deleted') {
    update.canceled_at = now
  }

  const { error } = await admin
    .from('webportal_ad_orders')
    .update(update)
    .eq('id', orderId)

  if (error) throw error
  return true
}

export async function handleWebPortalStripeEvent(
  admin: any,
  event: Stripe.Event
) {
  if (await handleSupportCheckout(admin, event)) return true
  if (await handleAdCheckout(admin, event)) return true
  if (await handleAdSubscription(admin, event)) return true
  return false
}
