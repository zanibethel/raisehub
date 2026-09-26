'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import {
  getActiveDataEnvironment,
  recordMatchesEnvironment,
  recordsShareEnvironment,
} from '@/lib/data-environment'
import {
  createEventPromotionCheckoutSession,
  getEventPromotionStripeMode,
} from '@/lib/stripe/event-promotion'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type {
  EventPromotionEventState,
  EventPromotionFundingSource,
  EventPromotionHistoryItem,
  EventPromotionPurchaseHistoryItem,
  RedeemEventPromotionResult,
  StartPaidEventPromotionResult,
} from '@/lib/types/event-promotion'

type BusinessRow = {
  id: string
  name: string
  legacy_profile_id: string | null
  is_demo: boolean
  demo_group: string | null
}

type EventRow = {
  id: string
  business_id: string
  title: string
  starts_at: string
  ends_at: string | null
  is_published: boolean
  is_demo: boolean
  demo_group: string | null
}

async function resolveOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')

  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin')?.trim()
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, '')

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`

  return 'http://localhost:3000'
}

async function loadManagedEventContext(
  businessId: string,
  eventId: string
): Promise<
  | {
      ok: true
      user: { id: string; email?: string | null }
      business: BusinessRow
      event: EventRow
    }
  | { ok: false; error: string }
> {
  const cleanBusinessId = businessId.trim()
  const cleanEventId = eventId.trim()

  if (!cleanBusinessId || !cleanEventId) {
    return { ok: false, error: 'Business event was not found.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Sign in before managing Event Promotion.' }
  }

  const admin = createAdminClient() as any
  const [businessResult, eventResult, membershipResult] = await Promise.all([
    admin
      .from('businesses')
      .select('id,name,legacy_profile_id,is_demo,demo_group')
      .eq('id', cleanBusinessId)
      .maybeSingle(),
    admin
      .from('business_events')
      .select(
        'id,business_id,title,starts_at,ends_at,is_published,is_demo,demo_group'
      )
      .eq('id', cleanEventId)
      .eq('business_id', cleanBusinessId)
      .maybeSingle(),
    supabase
      .from('business_memberships')
      .select('id')
      .eq('business_id', cleanBusinessId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('membership_role', ['owner', 'manager'])
      .maybeSingle(),
  ])

  const business = businessResult.data as BusinessRow | null
  const event = eventResult.data as EventRow | null

  if (businessResult.error || !business || eventResult.error || !event) {
    return { ok: false, error: 'Business event was not found.' }
  }

  const allowed =
    Boolean(membershipResult.data) || business.legacy_profile_id === user.id

  if (!allowed) {
    return {
      ok: false,
      error: 'Only a business owner or manager can manage Event Promotion.',
    }
  }

  const environment = getActiveDataEnvironment()
  if (
    !recordMatchesEnvironment(business, environment) ||
    !recordMatchesEnvironment(event, environment) ||
    !recordsShareEnvironment(business, event)
  ) {
    return {
      ok: false,
      error: 'This event is not available in the active RaiseHub environment.',
    }
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email },
    business,
    event,
  }
}

function fundingSource(value: unknown): EventPromotionFundingSource {
  if (value === 'paid' || value === 'demo_paid') return value
  return 'partner_points'
}

export async function getEventPromotionEventStateAction(
  businessId: string,
  eventId: string
): Promise<EventPromotionEventState | null> {
  const context = await loadManagedEventContext(businessId, eventId)
  if (!context.ok) return null

  const admin = createAdminClient() as any
  const now = new Date().toISOString()

  const [
    settingsResult,
    pricesResult,
    activeResult,
    promotionHistoryResult,
    purchaseHistoryResult,
  ] = await Promise.all([
    admin
      .from('event_promotion_settings')
      .select(
        'paid_enabled,default_paid_duration_days,partner_points_enabled,partner_point_cost,partner_point_duration_days,supporter_spotlight_enabled,local_events_featured_enabled'
      )
      .eq('id', 'default')
      .maybeSingle(),
    admin
      .from('event_promotion_price_options')
      .select('duration_days,price_cents,is_enabled,sort_order')
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true })
      .order('duration_days', { ascending: true }),
    admin
      .from('business_event_promotions')
      .select('id,promotion_source,starts_at,ends_at,created_at')
      .eq('event_id', context.event.id)
      .lte('starts_at', now)
      .gt('ends_at', now)
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('business_event_promotions')
      .select('id,promotion_source,starts_at,ends_at,created_at')
      .eq('event_id', context.event.id)
      .order('created_at', { ascending: false })
      .limit(8),
    admin
      .from('event_promotion_purchases')
      .select(
        'id,duration_days,expected_amount_cents,currency,status,created_at,fulfilled_at'
      )
      .eq('event_id', context.event.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (
    settingsResult.error ||
    pricesResult.error ||
    activeResult.error ||
    promotionHistoryResult.error ||
    purchaseHistoryResult.error
  ) {
    return null
  }

  const settings = settingsResult.data ?? {}
  const defaultDuration = Number(
    settings.default_paid_duration_days ?? 0
  )
  const priceOptions = (pricesResult.data ?? []).map((row: any) => ({
    durationDays: Number(row.duration_days),
    priceCents: Number(row.price_cents),
    isDefault: Number(row.duration_days) === defaultDuration,
  }))

  const toPromotion = (row: any): EventPromotionHistoryItem => ({
    id: String(row.id),
    source: fundingSource(row.promotion_source),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    createdAt: String(row.created_at),
  })

  const activePromotion = activeResult.data
    ? toPromotion(activeResult.data)
    : null
  const promotionHistory = (promotionHistoryResult.data ?? []).map(toPromotion)
  const purchaseHistory = (purchaseHistoryResult.data ?? []).map(
    (row: any): EventPromotionPurchaseHistoryItem => ({
      id: String(row.id),
      durationDays: Number(row.duration_days),
      amountCents: Number(row.expected_amount_cents),
      currency: String(row.currency ?? 'usd'),
      status: row.status,
      createdAt: String(row.created_at),
      fulfilledAt: row.fulfilled_at ? String(row.fulfilled_at) : null,
    })
  )

  return {
    paidEnabled: settings.paid_enabled !== false,
    partnerPointsEnabled: settings.partner_points_enabled !== false,
    partnerPointCost: Number(settings.partner_point_cost ?? 600),
    partnerPointDurationDays: Number(
      settings.partner_point_duration_days ?? 7
    ),
    defaultPaidDurationDays:
      defaultDuration > 0 ? defaultDuration : priceOptions[0]?.durationDays ?? null,
    supporterSpotlightEnabled:
      settings.supporter_spotlight_enabled !== false,
    localEventsFeaturedEnabled:
      settings.local_events_featured_enabled !== false,
    priceOptions,
    stripeMode: context.business.is_demo
      ? 'demo'
      : getEventPromotionStripeMode(),
    activePromotion,
    promotionHistory,
    purchaseHistory,
  }
}

export async function redeemEventPromotionWithPartnerPointsAction(
  businessId: string,
  eventId: string
): Promise<RedeemEventPromotionResult> {
  const context = await loadManagedEventContext(businessId, eventId)
  if (!context.ok) return { success: false, error: context.error }

  if (!context.event.is_published) {
    return {
      success: false,
      error: 'Publish this event before using Partner Points to promote it.',
    }
  }

  const admin = createAdminClient() as any
  const { error } = await admin.rpc('redeem_partner_reward_for_event', {
    p_business_id: context.business.id,
    p_event_id: context.event.id,
    p_actor_id: context.user.id,
    p_idempotency_key: crypto.randomUUID(),
  })

  if (error) {
    const message = error.message?.toLowerCase() ?? ''

    if (message.includes('not enough eligible partner points')) {
      return {
        success: false,
        error: 'You do not have enough eligible Partner Points for this promotion yet.',
      }
    }
    if (message.includes('already active')) {
      return {
        success: false,
        error: 'Event Promotion is already active for this event.',
      }
    }
    if (message.includes('paid event promotion checkout is already open')) {
      return {
        success: false,
        error:
          'A paid promotion checkout is already open for this event. Finish or let that checkout expire first.',
      }
    }
    if (message.includes('within the next 30 days')) {
      return {
        success: false,
        error:
          'Partner Points can promote a published event within the next 30 days.',
      }
    }
    if (message.includes('not currently available')) {
      return {
        success: false,
        error: 'Partner Point Event Promotion is not currently enabled.',
      }
    }

    return {
      success: false,
      error: 'Could not activate Event Promotion with Partner Points.',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/business/events')
  revalidatePath('/events')
  revalidatePath('/home')

  return {
    success: true,
    message:
      'Featured Local Event activated with Partner Points. RaiseHub has applied the current Owner-managed duration.',
  }
}

export async function startPaidEventPromotionAction(input: {
  businessId: string
  eventId: string
  durationDays: number
}): Promise<StartPaidEventPromotionResult> {
  const context = await loadManagedEventContext(
    input.businessId,
    input.eventId
  )
  if (!context.ok) return { status: 'error', message: context.error }

  if (!context.event.is_published) {
    return {
      status: 'error',
      message: 'Publish this event before starting paid Event Promotion.',
    }
  }

  const stripeMode = context.business.is_demo
    ? 'demo'
    : getEventPromotionStripeMode()

  if (stripeMode === 'unconfigured') {
    return {
      status: 'error',
      message:
        'Paid Event Promotion is ready, but Stripe Checkout is not configured in this deployment.',
    }
  }

  if (stripeMode === 'live-disabled') {
    return {
      status: 'error',
      message:
        'Live Event Promotion charging is disabled until the Stripe live account is verified.',
    }
  }

  const durationDays = Math.trunc(Number(input.durationDays))
  if (!Number.isFinite(durationDays) || durationDays <= 0) {
    return { status: 'error', message: 'Choose a valid promotion duration.' }
  }

  const admin = createAdminClient() as any
  const { data, error } = await admin.rpc(
    'create_event_promotion_purchase_attempt',
    {
      p_business_id: context.business.id,
      p_event_id: context.event.id,
      p_purchased_by: context.user.id,
      p_duration_days: durationDays,
      p_expected_is_demo: context.business.is_demo,
      p_expected_demo_group: context.business.demo_group,
    }
  )

  if (error) {
    const message = error.message?.toLowerCase() ?? ''

    if (message.includes('already active')) {
      return {
        status: 'error',
        message:
          'This event already has an active promotion. RaiseHub will not sell a duplicate boost.',
      }
    }
    if (message.includes('checkout is already open')) {
      return {
        status: 'error',
        message:
          'A paid promotion checkout is already open for this event. Finish or let it expire first.',
      }
    }
    if (message.includes('not currently available')) {
      return {
        status: 'error',
        message: 'That paid Event Promotion option is not currently enabled.',
      }
    }

    return {
      status: 'error',
      message: 'RaiseHub could not prepare this Event Promotion checkout.',
    }
  }

  const purchase = Array.isArray(data) ? data[0] : data
  if (!purchase?.purchase_id) {
    return {
      status: 'error',
      message: 'RaiseHub could not create the Event Promotion purchase record.',
    }
  }

  if (context.business.is_demo) {
    const { error: demoError } = await admin.rpc(
      'fulfill_demo_event_promotion_purchase',
      { p_purchase_id: purchase.purchase_id }
    )

    if (demoError) {
      await admin
        .from('event_promotion_purchases')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_message: demoError.message?.slice(0, 500) ?? 'Demo simulation failed.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchase.purchase_id)

      return {
        status: 'error',
        message: 'The Demo promotion could not be simulated.',
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/business/events')
    revalidatePath('/events')
    revalidatePath('/home')

    return {
      status: 'demo-complete',
      message:
        'Demo paid promotion simulated successfully. No Stripe charge was created.',
    }
  }

  try {
    const origin = await resolveOrigin()
    const query = new URLSearchParams({
      business: context.business.id,
      event: context.event.id,
    })
    const successUrl = `${origin}/dashboard/business/events?${query.toString()}&promotion=success`
    const cancelUrl = `${origin}/dashboard/business/events?${query.toString()}&promotion=canceled`

    const session = await createEventPromotionCheckoutSession({
      purchaseId: String(purchase.purchase_id),
      businessId: context.business.id,
      eventId: context.event.id,
      eventTitle: context.event.title,
      durationDays: Number(purchase.duration_days),
      amountCents: Number(purchase.amount_cents),
      currency: String(purchase.currency ?? 'usd'),
      customerEmail: context.user.email ?? null,
      successUrl,
      cancelUrl,
    })

    if (!session.url) {
      throw new Error('Stripe Checkout did not return a redirect URL.')
    }

    const { error: persistError } = await admin
      .from('event_promotion_purchases')
      .update({
        status: 'open',
        stripe_checkout_session_id: session.id,
        stripe_livemode: stripeMode === 'live',
        checkout_expires_at: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        failure_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchase.purchase_id)
      .eq('status', 'created')

    if (persistError) throw persistError

    return { status: 'checkout-ready', url: session.url }
  } catch (checkoutError) {
    const message =
      checkoutError instanceof Error
        ? checkoutError.message
        : 'Stripe Checkout could not start.'

    await admin
      .from('event_promotion_purchases')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchase.purchase_id)
      .is('fulfilled_at', null)

    return {
      status: 'error',
      message: 'Stripe Checkout could not be opened. Please try again.',
    }
  }
}
