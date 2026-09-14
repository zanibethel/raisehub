import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  PARTNER_REWARDS_RULE_VERSION,
  PARTNER_REWARDS_SCORING_VERSION,
  scoreOfferForPartnerRewards,
} from '@/lib/rewards/partner-rewards'

const DAY_MS = 24 * 60 * 60 * 1000
const PROFILE_COMPLETION_POINTS = 100
const REDEMPTION_POINTS = 10
const UNIQUE_SUPPORTER_BONUS_POINTS = 5
const MAX_DAILY_POINT_OFFERS = 3

type ReconcileResult = {
  skipped: boolean
  profileEvents: number
  offerDayEvents: number
  redemptionEvents: number
  uniqueSupporterEvents: number
}

export type DemoRewardsNetworkReconcileResult = {
  skipped: boolean
  demoGroup: string | null
  businessesChecked: number
  reconciledAt: string | null
}

type DemoBusiness = {
  id: string
  legacy_profile_id: string | null
  is_demo: boolean
  demo_group: string | null
}

type RewardPeriod = {
  id: string
  starts_at: string
  ends_at: string
}

type OfferRow = {
  id: string
  title: string
  discount: string | null
  description: string | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean | null
}

type RedemptionRow = {
  id: string
  offer_id: string
  user_id: string
  created_at: string
  confirmed_at: string | null
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function isoDay(value: Date) {
  return value.toISOString().slice(0, 10)
}

async function getOpenRewardPeriod(admin: any): Promise<RewardPeriod | null> {
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('partner_reward_periods')
    .select('id, starts_at, ends_at')
    .eq('status', 'open')
    .lte('starts_at', now)
    .gt('ends_at', now)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as RewardPeriod | null) ?? null
}

async function insertPointEvent(admin: any, values: Record<string, unknown>) {
  const { error } = await admin
    .from('partner_point_events')
    .upsert(values, { onConflict: 'idempotency_key', ignoreDuplicates: true })

  if (error) throw error
}

export async function reconcileDemoPartnerRewards(
  businessId: string | null
): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    skipped: true,
    profileEvents: 0,
    offerDayEvents: 0,
    redemptionEvents: 0,
    uniqueSupporterEvents: 0,
  }

  if (!businessId) return result

  const admin = createAdminClient() as any
  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('id, legacy_profile_id, is_demo, demo_group')
    .eq('id', businessId)
    .maybeSingle()

  if (businessError) throw businessError
  const demoBusiness = business as DemoBusiness | null
  if (!demoBusiness?.is_demo || !demoBusiness.demo_group || !demoBusiness.legacy_profile_id) {
    return result
  }

  const period = await getOpenRewardPeriod(admin)
  if (!period) return result

  result.skipped = false
  const eligibilityStatus = 'eligible'

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('business_name, phone, address, logo_url')
    .eq('id', demoBusiness.legacy_profile_id)
    .maybeSingle()

  if (profileError) throw profileError

  const profileComplete = Boolean(
    profile?.business_name && profile?.phone && profile?.address && profile?.logo_url
  )

  if (profileComplete) {
    await insertPointEvent(admin, {
      business_id: businessId,
      reward_period_id: period.id,
      event_type: 'profile_complete',
      points: PROFILE_COMPLETION_POINTS,
      eligibility_status: eligibilityStatus,
      source_type: 'business_profile',
      source_id: demoBusiness.legacy_profile_id,
      idempotency_key: `partner:${period.id}:profile_complete:${businessId}`,
      rule_version: PARTNER_REWARDS_RULE_VERSION,
      metadata: {
        derived_from: ['business_name', 'phone', 'address', 'logo_url'],
        demo_reconciliation: true,
      },
    })
    result.profileEvents += 1
  }

  const { data: offerData, error: offerError } = await admin
    .from('offers')
    .select('id, title, discount, description, starts_at, ends_at, is_active')
    .eq('business_id', demoBusiness.legacy_profile_id)
    .eq('is_demo', true)
    .eq('demo_group', demoBusiness.demo_group)

  if (offerError) throw offerError
  const offers = (offerData ?? []) as OfferRow[]
  const scoredOffers = offers.map((offer) => ({
    offer,
    rewardScore: scoreOfferForPartnerRewards({
      title: offer.title,
      discount: offer.discount ?? '',
      description: offer.description ?? '',
      isExclusive: true,
    }),
  }))

  for (const entry of scoredOffers) {
    const { offer, rewardScore } = entry
    const { data: existingSnapshot, error: snapshotError } = await admin
      .from('offer_reward_score_snapshots')
      .select('id')
      .eq('offer_id', offer.id)
      .eq('reward_period_id', period.id)
      .is('effective_to', null)
      .maybeSingle()

    if (snapshotError) throw snapshotError
    if (!existingSnapshot) {
      const periodStart = new Date(period.starts_at)
      const offerStart = offer.starts_at ? new Date(offer.starts_at) : periodStart
      const effectiveFrom = offerStart > periodStart ? offerStart : periodStart
      const { error: insertSnapshotError } = await admin
        .from('offer_reward_score_snapshots')
        .insert({
          offer_id: offer.id,
          business_id: businessId,
          reward_period_id: period.id,
          score: rewardScore.quality.total,
          score_band: rewardScore.band,
          daily_weight: rewardScore.dailyWeight,
          scoring_version: PARTNER_REWARDS_SCORING_VERSION,
          input_snapshot: {
            title: offer.title,
            discount: offer.discount,
            description: offer.description,
            isExclusive: true,
          },
          effective_from: effectiveFrom.toISOString(),
        })
      if (insertSnapshotError) throw insertSnapshotError
    }
  }

  const periodStart = startOfUtcDay(new Date(period.starts_at))
  const periodEnd = startOfUtcDay(new Date(period.ends_at))
  const today = startOfUtcDay(new Date())
  const lastEligibleDay = today < periodEnd ? today : new Date(periodEnd.getTime() - DAY_MS)

  for (
    let day = new Date(periodStart);
    day <= lastEligibleDay;
    day = new Date(day.getTime() + DAY_MS)
  ) {
    const dayEnd = new Date(day.getTime() + DAY_MS)
    const qualifying = scoredOffers
      .filter(({ offer, rewardScore }) => {
        if (!rewardScore.earnsDailyPoints) return false
        const startsAt = offer.starts_at ? new Date(offer.starts_at) : periodStart
        const endsAt = offer.ends_at ? new Date(offer.ends_at) : new Date(period.ends_at)
        const endedNaturally = endsAt <= new Date()
        if (offer.is_active === false && !endedNaturally) return false
        return startsAt < dayEnd && endsAt > day
      })
      .sort((a, b) => b.rewardScore.dailyWeight - a.rewardScore.dailyWeight)
      .slice(0, MAX_DAILY_POINT_OFFERS)

    for (const { offer, rewardScore } of qualifying) {
      await insertPointEvent(admin, {
        business_id: businessId,
        reward_period_id: period.id,
        offer_id: offer.id,
        event_type: 'active_offer_daily',
        points: rewardScore.dailyWeight,
        eligibility_status: eligibilityStatus,
        source_type: 'offer',
        source_id: offer.id,
        idempotency_key: `partner:${period.id}:offer_day:${offer.id}:${isoDay(day)}`,
        rule_version: PARTNER_REWARDS_RULE_VERSION,
        metadata: {
          day: isoDay(day),
          offer_title: offer.title,
          offer_score: rewardScore.quality.total,
          score_band: rewardScore.band,
          daily_weight: rewardScore.dailyWeight,
          demo_reconciliation: true,
        },
      })
      result.offerDayEvents += 1
    }
  }

  const offerIds = offers.map((offer) => offer.id)
  if (offerIds.length > 0) {
    const { data: redemptionData, error: redemptionError } = await admin
      .from('redemptions')
      .select('id, offer_id, user_id, created_at, confirmed_at')
      .in('offer_id', offerIds)
      .eq('status', 'confirmed')
      .eq('is_demo', true)
      .eq('demo_group', demoBusiness.demo_group)
      .gte('created_at', period.starts_at)
      .lt('created_at', period.ends_at)
      .order('created_at', { ascending: true })

    if (redemptionError) throw redemptionError
    const redemptions = (redemptionData ?? []) as RedemptionRow[]
    const seenSupporters = new Set<string>()

    for (const redemption of redemptions) {
      await insertPointEvent(admin, {
        business_id: businessId,
        reward_period_id: period.id,
        offer_id: redemption.offer_id,
        event_type: 'confirmed_redemption',
        points: REDEMPTION_POINTS,
        eligibility_status: eligibilityStatus,
        source_type: 'redemption',
        source_id: redemption.id,
        idempotency_key: `partner:${period.id}:redemption:${redemption.id}`,
        rule_version: PARTNER_REWARDS_RULE_VERSION,
        metadata: {
          confirmed_at: redemption.confirmed_at,
          demo_reconciliation: true,
        },
      })
      result.redemptionEvents += 1

      if (!seenSupporters.has(redemption.user_id)) {
        seenSupporters.add(redemption.user_id)
        await insertPointEvent(admin, {
          business_id: businessId,
          reward_period_id: period.id,
          offer_id: redemption.offer_id,
          event_type: 'unique_supporter_redemption',
          points: UNIQUE_SUPPORTER_BONUS_POINTS,
          eligibility_status: eligibilityStatus,
          source_type: 'redemption',
          source_id: redemption.id,
          idempotency_key: `partner:${period.id}:unique_supporter:${businessId}:${redemption.user_id}`,
          rule_version: PARTNER_REWARDS_RULE_VERSION,
          metadata: {
            supporter_id: redemption.user_id,
            demo_reconciliation: true,
          },
        })
        result.uniqueSupporterEvents += 1
      }
    }
  }

  const reconciledAt = new Date().toISOString()
  const { error: checkpointError } = await admin
    .from('partner_reward_checkpoints')
    .upsert(
      {
        business_id: businessId,
        reward_period_id: period.id,
        last_reconciled_at: reconciledAt,
      },
      { onConflict: 'business_id,reward_period_id' }
    )

  if (checkpointError) throw checkpointError

  return result
}

export async function reconcileDemoPartnerRewardsGroup(
  demoGroup: string | null
): Promise<DemoRewardsNetworkReconcileResult> {
  const emptyResult: DemoRewardsNetworkReconcileResult = {
    skipped: true,
    demoGroup,
    businessesChecked: 0,
    reconciledAt: null,
  }

  const normalizedGroup = demoGroup?.trim()
  if (!normalizedGroup) return emptyResult

  const admin = createAdminClient() as any
  const { data: businesses, error } = await admin
    .from('businesses')
    .select('id')
    .eq('is_demo', true)
    .eq('demo_group', normalizedGroup)
    .eq('status', 'active')

  if (error) throw error

  const businessIds = (businesses ?? [])
    .map((business: { id: string | null }) => business.id)
    .filter((id: string | null): id is string => Boolean(id))

  for (const businessId of businessIds) {
    await reconcileDemoPartnerRewards(businessId)
  }

  return {
    skipped: false,
    demoGroup: normalizedGroup,
    businessesChecked: businessIds.length,
    reconciledAt: new Date().toISOString(),
  }
}

export async function reconcileDemoPartnerRewardsNetwork(
  businessId: string | null
): Promise<DemoRewardsNetworkReconcileResult> {
  if (!businessId) {
    return {
      skipped: true,
      demoGroup: null,
      businessesChecked: 0,
      reconciledAt: null,
    }
  }

  const admin = createAdminClient() as any
  const { data: business, error } = await admin
    .from('businesses')
    .select('is_demo, demo_group')
    .eq('id', businessId)
    .maybeSingle()

  if (error) throw error
  if (!business?.is_demo || !business.demo_group) {
    return {
      skipped: true,
      demoGroup: null,
      businessesChecked: 0,
      reconciledAt: null,
    }
  }

  return reconcileDemoPartnerRewardsGroup(business.demo_group)
}
