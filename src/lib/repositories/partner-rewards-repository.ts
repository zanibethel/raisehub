import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type PartnerRewardPeriod = {
  id: string
  label: string
  starts_at: string
  ends_at: string
  status: string
  rule_version: string
  total_eligible_points: number | null
}

export type PartnerPointEvent = {
  id: string
  event_type: string
  points: number
  eligibility_status: 'pending' | 'eligible' | 'ineligible' | 'reversed'
  source_type: string | null
  source_id: string | null
  created_at: string
}

export type PartnerRewardMarketplaceItem = {
  id: string
  code: string
  name: string
  description: string
  category: 'offer_capacity' | 'promotion' | 'premium_feature'
  point_cost: number
  duration_days: number | null
  benefit_config: Record<string, unknown>
  is_active: boolean
  sort_order: number
}

export type PartnerRewardRedemption = {
  id: string
  marketplace_item_id: string
  points_spent: number
  status: 'active' | 'expired' | 'reversed'
  starts_at: string
  ends_at: string | null
  benefit_snapshot: Record<string, unknown>
  created_at: string
}

export type PartnerRewardQuarterHistoryItem = {
  awardId: string
  rewardPeriodId: string
  periodLabel: string
  eligiblePoints: number
  finalShareFraction: number | null
  awardCents: number
  finalizedAt: string
  payoutStatus: 'pending' | 'submitted' | 'paid' | 'failed' | 'reversed' | null
  stripeTransferId: string | null
  submittedAt: string | null
  reversedAt: string | null
  failureMessage: string | null
}

export type PartnerRewardsSummary = {
  period: PartnerRewardPeriod | null
  eligiblePoints: number
  pendingPoints: number
  totalPoints: number
  networkEligiblePoints: number | null
  currentShare: number | null
  recentEvents: PartnerPointEvent[]
  marketplaceItems: PartnerRewardMarketplaceItem[]
  activeRedemptions: PartnerRewardRedemption[]
  activeExtraOfferSlots: number
  quarterHistory: PartnerRewardQuarterHistoryItem[]
  currentPeriodEligiblePoints: number
  founderStatus: boolean
  founderMultiplier: number
  founderMultiplierEndsAt: string | null
}

const EMPTY_SUMMARY: PartnerRewardsSummary = {
  period: null,
  eligiblePoints: 0,
  pendingPoints: 0,
  totalPoints: 0,
  networkEligiblePoints: null,
  currentShare: null,
  recentEvents: [],
  marketplaceItems: [],
  activeRedemptions: [],
  activeExtraOfferSlots: 0,
  quarterHistory: [],
  currentPeriodEligiblePoints: 0,
  founderStatus: false,
  founderMultiplier: 1,
  founderMultiplierEndsAt: null,
}

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function toBenefitConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function redemptionIsActive(redemption: PartnerRewardRedemption, now = Date.now()) {
  if (redemption.status !== 'active') return false
  if (!redemption.ends_at) return true
  const end = new Date(redemption.ends_at).getTime()
  return Number.isFinite(end) && end > now
}

function extraOfferSlotsFromRedemption(redemption: PartnerRewardRedemption) {
  const snapshot = toBenefitConfig(redemption.benefit_snapshot)
  const benefitConfig = toBenefitConfig(snapshot.benefit_config)
  return Math.max(0, Math.floor(toNumber(benefitConfig.extra_offer_slots)))
}

async function getEnvironmentNetworkEligiblePoints(
  businessId: string,
  rewardPeriodId: string
): Promise<number | null> {
  const admin = createAdminClient() as any
  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('is_demo, demo_group')
    .eq('id', businessId)
    .maybeSingle()

  if (businessError || !business) return null

  let query = admin
    .from('partner_point_events')
    .select('points')
    .eq('reward_period_id', rewardPeriodId)
    .eq('eligibility_status', 'eligible')
    .eq('is_demo', business.is_demo === true)

  if (business.is_demo === true) {
    if (!business.demo_group) return null
    query = query.eq('demo_group', business.demo_group)
  } else {
    query = query.is('demo_group', null)
  }

  const { data, error } = await query
  if (error) return null

  return (data ?? []).reduce(
    (sum: number, row: { points: number | string | null }) => sum + toNumber(row.points),
    0
  )
}

async function canReadBusinessRewardHistory(supabase: any, businessId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'owner') return true

  const { data: membership } = await supabase
    .from('business_memberships')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  return Boolean(membership)
}

async function getBusinessQuarterHistory(
  supabase: any,
  businessId: string
): Promise<PartnerRewardQuarterHistoryItem[]> {
  if (!(await canReadBusinessRewardHistory(supabase, businessId))) return []

  const admin = createAdminClient() as any
  const { data: awards, error: awardsError } = await admin
    .from('partner_reward_quarter_awards')
    .select('id, reward_period_id, eligible_points, final_share_fraction, award_cents, finalized_at')
    .eq('business_id', businessId)
    .not('finalized_at', 'is', null)
    .order('finalized_at', { ascending: false })

  if (awardsError || !awards?.length) return []

  const awardIds = awards.map((award: any) => String(award.id))
  const periodIds = [...new Set(awards.map((award: any) => String(award.reward_period_id)))]

  const [{ data: periods }, { data: payouts }] = await Promise.all([
    admin.from('partner_reward_periods').select('id, label').in('id', periodIds),
    admin
      .from('partner_reward_payouts')
      .select('award_id, status, stripe_transfer_id, submitted_at, reversed_at, failure_message')
      .in('award_id', awardIds),
  ])

  const labelByPeriod = new Map<string, string>(
    (periods ?? []).map((row: any) => [String(row.id), String(row.label)])
  )
  const payoutByAward = new Map<string, any>(
    (payouts ?? []).map((row: any) => [String(row.award_id), row])
  )

  return awards.map((award: any) => {
    const payout = payoutByAward.get(String(award.id)) ?? null
    return {
      awardId: String(award.id),
      rewardPeriodId: String(award.reward_period_id),
      periodLabel: labelByPeriod.get(String(award.reward_period_id)) ?? 'Quarter',
      eligiblePoints: toNumber(award.eligible_points),
      finalShareFraction:
        award.final_share_fraction === null
          ? null
          : toNumber(award.final_share_fraction),
      awardCents: toNumber(award.award_cents),
      finalizedAt: String(award.finalized_at),
      payoutStatus: payout?.status ?? null,
      stripeTransferId: payout?.stripe_transfer_id ?? null,
      submittedAt: payout?.submitted_at ?? null,
      reversedAt: payout?.reversed_at ?? null,
      failureMessage: payout?.failure_message ?? null,
    }
  })
}

export async function getPartnerRewardsSummary(
  businessId: string | null
): Promise<PartnerRewardsSummary> {
  if (!businessId) return EMPTY_SUMMARY

  const supabase = await createClient()

  const [{ data: marketplaceData }, { data: redemptionData }, { data: founderData }, quarterHistory] = await Promise.all([
    (supabase as any)
      .from('partner_reward_marketplace_items')
      .select('id, code, name, description, category, point_cost, duration_days, benefit_config, is_active, sort_order')
      .order('sort_order', { ascending: true }),
    (supabase as any)
      .from('partner_reward_redemptions')
      .select('id, marketplace_item_id, points_spent, status, starts_at, ends_at, benefit_snapshot, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false }),
    (supabase as any)
      .from('businesses')
      .select('founder_status, founder_multiplier, founder_multiplier_ends_at')
      .eq('id', businessId)
      .maybeSingle(),
    getBusinessQuarterHistory(supabase as any, businessId),
  ])

  const marketplaceItems = ((marketplaceData ?? []) as PartnerRewardMarketplaceItem[]).map(
    (item) => ({
      ...item,
      point_cost: toNumber(item.point_cost),
      benefit_config: toBenefitConfig(item.benefit_config),
    })
  )

  const redemptions = ((redemptionData ?? []) as PartnerRewardRedemption[]).map(
    (redemption) => ({
      ...redemption,
      points_spent: toNumber(redemption.points_spent),
      benefit_snapshot: toBenefitConfig(redemption.benefit_snapshot),
    })
  )
  const founderStatus = founderData?.founder_status === true
  const founderMultiplier = toNumber(founderData?.founder_multiplier) || 1
  const founderMultiplierEndsAt = founderData?.founder_multiplier_ends_at ?? null
  const activeRedemptions = redemptions.filter((redemption) => redemptionIsActive(redemption))
  const activeExtraOfferSlots = activeRedemptions.reduce(
    (sum, redemption) => sum + extraOfferSlotsFromRedemption(redemption),
    0
  )

  const { data: periodData, error: periodError } = await (supabase as any)
    .from('partner_reward_periods')
    .select('id, label, starts_at, ends_at, status, rule_version, total_eligible_points')
    .eq('status', 'open')
    .maybeSingle()

  if (periodError || !periodData) {
    return {
      ...EMPTY_SUMMARY,
      marketplaceItems,
      activeRedemptions,
      activeExtraOfferSlots,
      quarterHistory,
      founderStatus,
      founderMultiplier,
      founderMultiplierEndsAt,
    }
  }

  const period = periodData as PartnerRewardPeriod

  const { data: eventData, error: eventError } = await (supabase as any)
    .from('partner_point_events')
    .select('id, event_type, points, eligibility_status, source_type, source_id, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (eventError) {
    return {
      ...EMPTY_SUMMARY,
      period,
      networkEligiblePoints: null,
      marketplaceItems,
      activeRedemptions,
      activeExtraOfferSlots,
      quarterHistory,
      founderStatus,
      founderMultiplier,
      founderMultiplierEndsAt,
    }
  }

  const events = (eventData ?? []) as PartnerPointEvent[]
  const earnedEligiblePoints = events
    .filter((event) => event.eligibility_status === 'eligible' && event.event_type !== 'reward_marketplace_redemption')
    .reduce((sum, event) => sum + toNumber(event.points), 0)
  const spentPoints = redemptions
    .filter((redemption) => redemption.status !== 'reversed')
    .reduce((sum, redemption) => sum + toNumber(redemption.points_spent), 0)
  const eligiblePoints = Math.max(0, earnedEligiblePoints - spentPoints)
  const pendingPoints = events
    .filter((event) => event.eligibility_status === 'pending')
    .reduce((sum, event) => sum + toNumber(event.points), 0)
  const totalPoints = eligiblePoints + pendingPoints
  const currentPeriodEligiblePoints = events
    .filter((event) => event.eligibility_status === 'eligible' && event.event_type !== 'reward_marketplace_redemption')
    .filter((event) => {
      const createdAt = new Date(event.created_at).getTime()
      return createdAt >= new Date(period.starts_at).getTime() && createdAt < new Date(period.ends_at).getTime()
    })
    .reduce((sum, event) => sum + toNumber(event.points), 0)
  const networkEligiblePoints = await getEnvironmentNetworkEligiblePoints(
    businessId,
    period.id
  )
  const currentShare =
    networkEligiblePoints && networkEligiblePoints > 0
      ? currentPeriodEligiblePoints / networkEligiblePoints
      : null

  return {
    period,
    eligiblePoints,
    pendingPoints,
    totalPoints,
    networkEligiblePoints,
    currentShare,
    recentEvents: events.slice(0, 8),
    marketplaceItems,
    activeRedemptions,
    activeExtraOfferSlots,
    quarterHistory,
    currentPeriodEligiblePoints,
    founderStatus,
    founderMultiplier,
    founderMultiplierEndsAt,
  }
}
