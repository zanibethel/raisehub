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

export type PartnerRewardsSummary = {
  period: PartnerRewardPeriod | null
  eligiblePoints: number
  pendingPoints: number
  totalPoints: number
  networkEligiblePoints: number | null
  currentShare: number | null
  recentEvents: PartnerPointEvent[]
}

const EMPTY_SUMMARY: PartnerRewardsSummary = {
  period: null,
  eligiblePoints: 0,
  pendingPoints: 0,
  totalPoints: 0,
  networkEligiblePoints: null,
  currentShare: null,
  recentEvents: [],
}

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getPartnerRewardsSummary(
  businessId: string | null
): Promise<PartnerRewardsSummary> {
  if (!businessId) return EMPTY_SUMMARY

  const supabase = await createClient()

  const { data: periodData, error: periodError } = await (supabase as any)
    .from('partner_reward_periods')
    .select('id, label, starts_at, ends_at, status, rule_version, total_eligible_points')
    .eq('status', 'open')
    .maybeSingle()

  if (periodError || !periodData) return EMPTY_SUMMARY

  const period = periodData as PartnerRewardPeriod

  const { data: eventData, error: eventError } = await (supabase as any)
    .from('partner_point_events')
    .select('id, event_type, points, eligibility_status, source_type, source_id, created_at')
    .eq('business_id', businessId)
    .eq('reward_period_id', period.id)
    .order('created_at', { ascending: false })

  if (eventError) {
    return {
      ...EMPTY_SUMMARY,
      period,
      networkEligiblePoints: period.total_eligible_points,
    }
  }

  const events = (eventData ?? []) as PartnerPointEvent[]
  const eligiblePoints = events
    .filter((event) => event.eligibility_status === 'eligible')
    .reduce((sum, event) => sum + toNumber(event.points), 0)
  const pendingPoints = events
    .filter((event) => event.eligibility_status === 'pending')
    .reduce((sum, event) => sum + toNumber(event.points), 0)
  const totalPoints = eligiblePoints + pendingPoints
  const networkEligiblePoints = period.total_eligible_points
  const currentShare =
    networkEligiblePoints && networkEligiblePoints > 0
      ? eligiblePoints / networkEligiblePoints
      : null

  return {
    period,
    eligiblePoints,
    pendingPoints,
    totalPoints,
    networkEligiblePoints,
    currentShare,
    recentEvents: events.slice(0, 8),
  }
}
