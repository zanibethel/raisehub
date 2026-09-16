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
const NETWORK_FRESHNESS_MS = 2 * 60 * 1000

type EligibilityStatus = 'pending' | 'eligible'

type BusinessRow = {
  id: string
  legacy_profile_id: string | null
  is_demo: boolean
  demo_group: string | null
  status: string | null
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

type CheckpointRow = {
  business_id: string
  last_reconciled_at: string | null
}

export type PartnerRewardsReconcileResult = {
  skipped: boolean
  businessId: string | null
  eligibilityStatus: EligibilityStatus | null
  profileEvents: number
  offerDayEvents: number
  redemptionEvents: number
  uniqueSupporterEvents: number
  reconciledAt: string | null
}

export type PartnerRewardsNetworkReconcileResult = {
  skipped: boolean
  isDemo: boolean | null
  demoGroup: string | null
  businessesChecked: number
  businessesReconciled: number
  reconciledAt: string | null
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function isoDay(value: Date) {
  return value.toISOString().slice(0, 10)
}

function eligibilityForBusiness(business: BusinessRow): EligibilityStatus {
  // Demo data is intentionally owner-controlled and isolated, so it can exercise
  // the full eligible-points UI. Live businesses remain pending until the real
  // RaiseHub Business Verification workflow is implemented.
  return business.is_demo ? 'eligible' : 'pending'
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

async function loadBusiness(admin: any, businessId: string): Promise<BusinessRow | null> {
  const { data, error } = await admin
    .from('businesses')
    .select('id, legacy_profile_id, is_demo, demo_group, status')
    .eq('id', businessId)
    .maybeSingle()

  if (error) throw error
  return (data as BusinessRow | null) ?? null
}

function scopeOfferQuery(query: any, business: BusinessRow) {
  query = query.eq('is_demo', business.is_demo === true)
  return business.is_demo
    ? query.eq('demo_group', business.demo_group)
    : query.is('demo_group', null)
}

function scopeRedemptionQuery(query: any, business: BusinessRow) {
  query = query.eq('is_demo', business.is_demo === true)
  return business.is_demo
    ? query.eq('demo_group', business.demo_group)
    : query.is('demo_group', null)
}

export async function reconcilePartnerRewardsBusiness(
  businessId: string | null
): Promise<PartnerRewardsReconcileResult> {
  const empty: PartnerRewardsReconcileResult = {
    skipped: true,
    businessId,
    eligibilityStatus: null,
    profileEvents: 0,
    offerDayEvents: 0,
    redemptionEvents: 0,
    uniqueSupporterEvents: 0,
    reconciledAt: null,
  }

  if (!businessId) return empty

  const admin = createAdminClient() as any
  const business = await loadBusiness(admin, businessId)
  if (!business?.legacy_profile_id || business.status === 'archived') return empty
  if (business.is_demo && !business.demo_group) return empty

  const period = await getOpenRewardPeriod(admin)
  if (!period) return empty

  const eligibilityStatus = eligibilityForBusiness(business)
  const result: PartnerRewardsReconcileResult = {
    ...empty,
    skipped: false,
    eligibilityStatus,
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('business_name, phone, address, logo_url')
    .eq('id', business.legacy_profile_id)
    .maybeSingle()

  if (profileError) throw profileError

  const profileComplete = Boolean(
    profile?.business_name && profile?.phone && profile?.address && profile?.logo_url
  )

  if (profileComplete) {
    await insertPointEvent(admin, {
      business_id: business.id,
      reward_period_id: period.id,
      event_type: 'profile_complete',
      points: PROFILE_COMPLETION_POINTS,
      eligibility_status: eligibilityStatus,
      source_type: 'business_profile',
      source_id: business.legacy_profile_id,
      idempotency_key: `partner:${period.id}:profile_complete:${business.id}`,
      rule_version: PARTNER_REWARDS_RULE_VERSION,
      metadata: {
        derived_from: ['business_name', 'phone', 'address', 'logo_url'],
        environment: business.is_demo ? 'demo' : 'production',
      },
    })
    result.profileEvents += 1
  }

  let offerQuery = admin
    .from('offers')
    .select('id, title, discount, description, starts_at, ends_at, is_active')
    .eq('business_id', business.legacy_profile_id)
  offerQuery = scopeOfferQuery(offerQuery, business)

  const { data: offerData, error: offerError } = await offerQuery
  if (offerError) throw offerError

  const offers = (offerData ?? []) as OfferRow[]
  const scoredOffers = offers.map((offer) => ({
    offer,
    rewardScore: scoreOfferForPartnerRewards({
      title: offer.title,
      discount: offer.discount ?? '',
      description: offer.description ?? '',
      // RaiseHub offers are member-facing platform offers. Until a dedicated
      // exclusivity field exists, preserve the same assumption used by demo.
      isExclusive: true,
    }),
  }))

  for (const { offer, rewardScore } of scoredOffers) {
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

      const { error: snapshotInsertError } = await admin
        .from('offer_reward_score_snapshots')
        .insert({
          offer_id: offer.id,
          business_id: business.id,
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

      if (snapshotInsertError) throw snapshotInsertError
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
        business_id: business.id,
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
          environment: business.is_demo ? 'demo' : 'production',
        },
      })
      result.offerDayEvents += 1
    }
  }

  const offerIds = offers.map((offer) => offer.id)

  if (offerIds.length > 0) {
    let redemptionQuery = admin
      .from('redemptions')
      .select('id, offer_id, user_id, created_at, confirmed_at')
      .in('offer_id', offerIds)
      .eq('status', 'confirmed')
      .gte('created_at', period.starts_at)
      .lt('created_at', period.ends_at)
      .order('created_at', { ascending: true })
    redemptionQuery = scopeRedemptionQuery(redemptionQuery, business)

    const { data: redemptionData, error: redemptionError } = await redemptionQuery
    if (redemptionError) throw redemptionError

    const redemptions = (redemptionData ?? []) as RedemptionRow[]
    const seenSupporters = new Set<string>()

    for (const redemption of redemptions) {
      await insertPointEvent(admin, {
        business_id: business.id,
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
          environment: business.is_demo ? 'demo' : 'production',
        },
      })
      result.redemptionEvents += 1

      if (!seenSupporters.has(redemption.user_id)) {
        seenSupporters.add(redemption.user_id)
        await insertPointEvent(admin, {
          business_id: business.id,
          reward_period_id: period.id,
          offer_id: redemption.offer_id,
          event_type: 'unique_supporter_redemption',
          points: UNIQUE_SUPPORTER_BONUS_POINTS,
          eligibility_status: eligibilityStatus,
          source_type: 'redemption',
          source_id: redemption.id,
          idempotency_key: `partner:${period.id}:unique_supporter:${business.id}:${redemption.user_id}`,
          rule_version: PARTNER_REWARDS_RULE_VERSION,
          metadata: {
            supporter_id: redemption.user_id,
            environment: business.is_demo ? 'demo' : 'production',
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
        business_id: business.id,
        reward_period_id: period.id,
        last_reconciled_at: reconciledAt,
      },
      { onConflict: 'business_id,reward_period_id' }
    )

  if (checkpointError) throw checkpointError
  result.reconciledAt = reconciledAt
  return result
}

async function getFreshBusinessIds(
  admin: any,
  rewardPeriodId: string,
  businessIds: string[]
): Promise<Set<string>> {
  if (businessIds.length === 0) return new Set()

  const cutoff = Date.now() - NETWORK_FRESHNESS_MS
  const { data, error } = await admin
    .from('partner_reward_checkpoints')
    .select('business_id, last_reconciled_at')
    .eq('reward_period_id', rewardPeriodId)
    .in('business_id', businessIds)

  if (error) throw error

  return new Set(
    ((data ?? []) as CheckpointRow[])
      .filter((row) => {
        if (!row.last_reconciled_at) return false
        const reconciledAt = new Date(row.last_reconciled_at).getTime()
        return Number.isFinite(reconciledAt) && reconciledAt >= cutoff
      })
      .map((row) => row.business_id)
  )
}

export async function reconcilePartnerRewardsNetwork(
  businessId: string | null,
  options: { force?: boolean } = {}
): Promise<PartnerRewardsNetworkReconcileResult> {
  const empty: PartnerRewardsNetworkReconcileResult = {
    skipped: true,
    isDemo: null,
    demoGroup: null,
    businessesChecked: 0,
    businessesReconciled: 0,
    reconciledAt: null,
  }

  if (!businessId) return empty

  const admin = createAdminClient() as any
  const sourceBusiness = await loadBusiness(admin, businessId)
  if (!sourceBusiness) return empty
  if (sourceBusiness.is_demo && !sourceBusiness.demo_group) return empty

  const period = await getOpenRewardPeriod(admin)
  if (!period) return empty

  let businessQuery = admin
    .from('businesses')
    .select('id')
    .eq('status', 'active')
    .eq('is_demo', sourceBusiness.is_demo === true)

  businessQuery = sourceBusiness.is_demo
    ? businessQuery.eq('demo_group', sourceBusiness.demo_group)
    : businessQuery.is('demo_group', null)

  const { data: businessData, error } = await businessQuery
  if (error) throw error

  const businessIds = (businessData ?? [])
    .map((row: { id: string | null }) => row.id)
    .filter((id: string | null): id is string => Boolean(id))

  const freshIds = options.force
    ? new Set<string>()
    : await getFreshBusinessIds(admin, period.id, businessIds)

  let businessesReconciled = 0
  for (const id of businessIds) {
    if (freshIds.has(id)) continue
    await reconcilePartnerRewardsBusiness(id)
    businessesReconciled += 1
  }

  return {
    skipped: false,
    isDemo: sourceBusiness.is_demo === true,
    demoGroup: sourceBusiness.is_demo ? sourceBusiness.demo_group : null,
    businessesChecked: businessIds.length,
    businessesReconciled,
    reconciledAt: new Date().toISOString(),
  }
}

export async function reconcilePartnerRewardsEnvironmentForProfile(
  profileId: string | null,
  options: { force?: boolean } = {}
): Promise<PartnerRewardsNetworkReconcileResult> {
  if (!profileId) {
    return {
      skipped: true,
      isDemo: null,
      demoGroup: null,
      businessesChecked: 0,
      businessesReconciled: 0,
      reconciledAt: null,
    }
  }

  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('businesses')
    .select('id')
    .eq('legacy_profile_id', profileId)
    .maybeSingle()

  if (error) throw error
  return reconcilePartnerRewardsNetwork(data?.id ?? null, options)
}
