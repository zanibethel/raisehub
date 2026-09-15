import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { reconcilePartnerRewardsNetwork } from '@/lib/rewards/partner-rewards-reconciliation'

export type PartnerRewardsQuarterReport = {
  id: string
  rewardPeriodId: string
  label: string
  status: string
  timezone: string
  startsAt: string
  endsAt: string
  qualifyingSalesCents: number
  grossPaidCents: number
  refundsCents: number
  platformAllocationCents: number
  platformRetainedCents: number
  partnerRewardsPoolCents: number
  eligiblePoints: number
  pendingPoints: number
  businessesWithEligiblePoints: number
  expectedDisbursementCents: number
  payoutReadyCents: number
  payoutBlockedCents: number
  lastRefreshedAt: string | null
}

export type PartnerRewardsQuarterBusinessRow = {
  businessId: string
  businessName: string
  eligiblePoints: number
  pendingPoints: number
  shareFraction: number | null
  expectedRewardCents: number
  verificationStatus: string
  stripePayoutReady: boolean
  payoutStatus: string
}

export type OwnerPartnerRewardsQuarterReportResult =
  | {
      status: 'success'
      report: PartnerRewardsQuarterReport
      businesses: PartnerRewardsQuarterBusinessRow[]
    }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string }

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getOwnerPartnerRewardsQuarterReport(): Promise<OwnerPartnerRewardsQuarterReportResult> {
  const admin = createAdminClient() as any
  const now = new Date().toISOString()

  const { data: period, error: periodError } = await admin
    .from('partner_reward_periods')
    .select('id, label, starts_at, ends_at, status')
    .lte('starts_at', now)
    .gt('ends_at', now)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (periodError) {
    console.error('Could not resolve current Partner Rewards period', periodError)
    return { status: 'error', message: 'Could not load the current Partner Rewards quarter.' }
  }

  if (!period) {
    return { status: 'empty', message: 'No active Partner Rewards quarter is configured.' }
  }

  const { data: sourceBusiness } = await admin
    .from('businesses')
    .select('id')
    .eq('is_demo', false)
    .is('demo_group', null)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (sourceBusiness?.id) {
    try {
      await reconcilePartnerRewardsNetwork(sourceBusiness.id)
    } catch (error) {
      console.error('Owner quarterly report network reconciliation failed', error)
    }
  }

  const { data: reportId, error: refreshError } = await admin.rpc(
    'refresh_partner_reward_quarter_report',
    {
      p_reward_period_id: period.id,
      p_is_demo: false,
      p_demo_group: null,
    }
  )

  if (refreshError || !reportId) {
    console.error('Could not refresh Partner Rewards quarter report', refreshError)
    return { status: 'error', message: 'Could not refresh the Partner Rewards quarter report.' }
  }

  const [{ data: reportData, error: reportError }, { data: rowData, error: rowError }] =
    await Promise.all([
      admin
        .from('partner_reward_quarter_reports')
        .select('*')
        .eq('id', reportId)
        .single(),
      admin
        .from('partner_reward_quarter_business_rows')
        .select('business_id, eligible_points, pending_points, share_fraction, expected_reward_cents, verification_status, stripe_payout_ready, payout_status')
        .eq('report_id', reportId)
        .order('expected_reward_cents', { ascending: false }),
    ])

  if (reportError || rowError || !reportData) {
    console.error('Could not read refreshed Partner Rewards quarter report', {
      reportError,
      rowError,
    })
    return { status: 'error', message: 'Could not load the refreshed Partner Rewards report.' }
  }

  const businessIds = (rowData ?? []).map((row: any) => row.business_id)
  const { data: businesses } = businessIds.length
    ? await admin.from('businesses').select('id, name').in('id', businessIds)
    : { data: [] }
  const businessNameById = new Map(
    (businesses ?? []).map((business: { id: string; name: string }) => [business.id, business.name])
  )

  const report: PartnerRewardsQuarterReport = {
    id: reportData.id,
    rewardPeriodId: period.id,
    label: period.label,
    status: reportData.report_status,
    timezone: reportData.timezone,
    startsAt: reportData.starts_at,
    endsAt: reportData.ends_at,
    qualifyingSalesCents: toNumber(reportData.qualifying_sales_cents),
    grossPaidCents: toNumber(reportData.gross_paid_cents),
    refundsCents: toNumber(reportData.refunds_cents),
    platformAllocationCents: toNumber(reportData.platform_allocation_cents),
    platformRetainedCents: toNumber(reportData.platform_retained_cents),
    partnerRewardsPoolCents: toNumber(reportData.partner_rewards_pool_cents),
    eligiblePoints: toNumber(reportData.eligible_points),
    pendingPoints: toNumber(reportData.pending_points),
    businessesWithEligiblePoints: toNumber(reportData.businesses_with_eligible_points),
    expectedDisbursementCents: toNumber(reportData.expected_disbursement_cents),
    payoutReadyCents: toNumber(reportData.payout_ready_cents),
    payoutBlockedCents: toNumber(reportData.payout_blocked_cents),
    lastRefreshedAt: reportData.last_refreshed_at,
  }

  const businessRows: PartnerRewardsQuarterBusinessRow[] = (rowData ?? []).map((row: any) => ({
    businessId: row.business_id,
    businessName: businessNameById.get(row.business_id) ?? 'Business',
    eligiblePoints: toNumber(row.eligible_points),
    pendingPoints: toNumber(row.pending_points),
    shareFraction: row.share_fraction === null ? null : toNumber(row.share_fraction),
    expectedRewardCents: toNumber(row.expected_reward_cents),
    verificationStatus: row.verification_status,
    stripePayoutReady: Boolean(row.stripe_payout_ready),
    payoutStatus: row.payout_status,
  }))

  return { status: 'success', report, businesses: businessRows }
}
