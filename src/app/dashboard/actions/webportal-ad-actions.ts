'use server'

import { revalidatePath } from 'next/cache'

import { getStripeClient } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  sendWebPortalAdApproved,
  sendWebPortalAdDeactivated,
  sendWebPortalAdRejected,
} from '@/lib/webportal/email'

export type WebPortalAdActionState = {
  ok: boolean
  message: string
}

export const initialWebPortalAdActionState: WebPortalAdActionState = {
  ok: false,
  message: '',
}

type WebPortalOrderRow = {
  id: string
  business_name: string
  contact_email: string
  duration_days: number
  recurring: boolean
  status: string
  stripe_payment_intent_id: string | null
  stripe_subscription_id: string | null
}

async function requireOwner() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('You must be signed in.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single<{ id: string; role: string }>()

  if (profileError || profile?.role !== 'owner') {
    throw new Error('Owner capability is required.')
  }

  return profile.id
}

function getOrderId(formData: FormData) {
  const value = String(formData.get('order_id') ?? '').trim()
  if (!value) throw new Error('WebPortal ad order is required.')
  return value
}

function getReviewNote(formData: FormData, required = false) {
  const value = String(formData.get('reason') ?? '').trim()
  if (required && (value.length < 3 || value.length > 500)) {
    throw new Error('Enter a reason between 3 and 500 characters.')
  }
  if (value.length > 500) {
    throw new Error('Reason must be 500 characters or fewer.')
  }
  return value || null
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Chicago',
  }).format(new Date(value))
}

function revalidateWebPortalAdmin() {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/owner/webportal')
}

async function fetchOrder(id: string) {
  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('webportal_ad_orders')
    .select(
      'id, business_name, contact_email, duration_days, recurring, status, stripe_payment_intent_id, stripe_subscription_id'
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    throw new Error('WebPortal ad order could not be found.')
  }

  return data as WebPortalOrderRow
}

export async function approveWebPortalAd(
  _previous: WebPortalAdActionState,
  formData: FormData
): Promise<WebPortalAdActionState> {
  try {
    const ownerId = await requireOwner()
    const id = getOrderId(formData)
    const note = getReviewNote(formData)
    const order = await fetchOrder(id)

    if (order.status !== 'paid_pending_review' && order.status !== 'approved') {
      throw new Error('Only a paid ad waiting for review can be activated.')
    }

    const startsAt = new Date()
    const endsAt = new Date(startsAt)
    endsAt.setUTCDate(endsAt.getUTCDate() + order.duration_days)

    const admin = createAdminClient() as any
    const { error } = await admin
      .from('webportal_ad_orders')
      .update({
        status: 'active',
        reviewed_by: ownerId,
        review_note: note,
        approved_at: startsAt.toISOString(),
        activated_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        rejected_at: null,
        deactivated_at: null,
        updated_at: startsAt.toISOString(),
      })
      .eq('id', id)
      .in('status', ['paid_pending_review', 'approved'])

    if (error) throw error

    const emailResult = await sendWebPortalAdApproved({
      orderId: order.id,
      businessName: order.business_name,
      contactEmail: order.contact_email,
      startsAt: formatDate(startsAt.toISOString()),
      endsAt: formatDate(endsAt.toISOString()),
      idempotencyKey: `webportal-ad-approved-${order.id}-${startsAt.toISOString()}`,
    })

    if (emailResult.status === 'failed') {
      console.error('WebPortal approval email failed', emailResult.error)
    }

    revalidateWebPortalAdmin()
    return {
      ok: true,
      message: `${order.business_name} is active through ${formatDate(endsAt.toISOString())}.`,
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : 'WebPortal ad approval failed.',
    }
  }
}

export async function rejectWebPortalAd(
  _previous: WebPortalAdActionState,
  formData: FormData
): Promise<WebPortalAdActionState> {
  try {
    const ownerId = await requireOwner()
    const id = getOrderId(formData)
    const reason = getReviewNote(formData, true)
    const order = await fetchOrder(id)

    if (order.status !== 'paid_pending_review') {
      throw new Error('Only an ad waiting for review can be rejected.')
    }

    const stripe = getStripeClient()
    const resolution: string[] = []

    if (order.stripe_subscription_id) {
      await stripe.subscriptions.cancel(order.stripe_subscription_id)
      resolution.push('Recurring billing was canceled.')
    }

    if (order.stripe_payment_intent_id) {
      await stripe.refunds.create(
        { payment_intent: order.stripe_payment_intent_id },
        { idempotencyKey: `webportal-ad-reject-refund-${order.id}` }
      )
      resolution.push('The captured payment was refunded.')
    } else if (!order.stripe_subscription_id) {
      resolution.push('No captured payment intent was available to refund automatically.')
    }

    const now = new Date().toISOString()
    const admin = createAdminClient() as any
    const { error } = await admin
      .from('webportal_ad_orders')
      .update({
        status: 'rejected',
        reviewed_by: ownerId,
        review_note: reason,
        rejected_at: now,
        canceled_at: order.stripe_subscription_id ? now : null,
        subscription_status: order.stripe_subscription_id ? 'canceled' : null,
        updated_at: now,
      })
      .eq('id', id)
      .eq('status', 'paid_pending_review')

    if (error) throw error

    const emailResult = await sendWebPortalAdRejected({
      orderId: order.id,
      businessName: order.business_name,
      contactEmail: order.contact_email,
      reason,
      paymentResolution: resolution.join(' '),
      idempotencyKey: `webportal-ad-rejected-${order.id}-${now}`,
    })

    if (emailResult.status === 'failed') {
      console.error('WebPortal rejection email failed', emailResult.error)
    }

    revalidateWebPortalAdmin()
    return {
      ok: true,
      message: `${order.business_name} was rejected. ${resolution.join(' ')}`,
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : 'WebPortal ad rejection failed.',
    }
  }
}

export async function deactivateWebPortalAd(
  _previous: WebPortalAdActionState,
  formData: FormData
): Promise<WebPortalAdActionState> {
  try {
    const ownerId = await requireOwner()
    const id = getOrderId(formData)
    const reason = getReviewNote(formData, true)
    const order = await fetchOrder(id)

    if (order.status !== 'active') {
      throw new Error('Only an active WebPortal ad can be deactivated.')
    }

    let recurringCanceled = false
    if (order.stripe_subscription_id) {
      const stripe = getStripeClient()
      await stripe.subscriptions.cancel(order.stripe_subscription_id)
      recurringCanceled = true
    }

    const now = new Date().toISOString()
    const admin = createAdminClient() as any
    const { error } = await admin
      .from('webportal_ad_orders')
      .update({
        status: 'canceled',
        reviewed_by: ownerId,
        review_note: reason,
        deactivated_at: now,
        canceled_at: recurringCanceled ? now : null,
        subscription_status: recurringCanceled ? 'canceled' : undefined,
        updated_at: now,
      })
      .eq('id', id)
      .eq('status', 'active')

    if (error) throw error

    const emailResult = await sendWebPortalAdDeactivated({
      orderId: order.id,
      businessName: order.business_name,
      contactEmail: order.contact_email,
      reason,
      recurringCanceled,
      idempotencyKey: `webportal-ad-deactivated-${order.id}-${now}`,
    })

    if (emailResult.status === 'failed') {
      console.error('WebPortal deactivation email failed', emailResult.error)
    }

    revalidateWebPortalAdmin()
    return {
      ok: true,
      message: recurringCanceled
        ? `${order.business_name} was removed from rotation and recurring billing was canceled.`
        : `${order.business_name} was removed from rotation.`,
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : 'WebPortal ad deactivation failed.',
    }
  }
}
