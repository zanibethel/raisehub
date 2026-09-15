import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type PartnerRewardsQuarterFinalizationResult = {
  periodsChecked: number
  reportsFinalized: number
  reportIds: string[]
}

/**
 * Finalizes production Partner Rewards periods whose Central-Time cutoff has passed.
 *
 * This does not freeze or alter campaign_purchases. The database finalization RPC
 * snapshots the quarter report and business awards as-of the period cutoff, then
 * marks that reporting period finalized so later running refreshes cannot rewrite it.
 */
export async function finalizeEndedPartnerRewardsQuarterReports(): Promise<PartnerRewardsQuarterFinalizationResult> {
  const admin = createAdminClient() as any
  const now = new Date().toISOString()

  const { data: periods, error } = await admin
    .from('partner_reward_periods')
    .select('id, label, ends_at, status')
    .in('status', ['open', 'closing'])
    .lte('ends_at', now)
    .order('ends_at', { ascending: true })

  if (error) throw error

  const reportIds: string[] = []

  for (const period of periods ?? []) {
    const { data: reportId, error: finalizeError } = await admin.rpc(
      'finalize_partner_reward_quarter_report',
      {
        p_reward_period_id: period.id,
        p_is_demo: false,
        p_demo_group: null,
      }
    )

    if (finalizeError) {
      console.error('Partner Rewards quarter finalization failed', {
        rewardPeriodId: period.id,
        label: period.label,
        error: finalizeError,
      })
      throw finalizeError
    }

    if (typeof reportId === 'string' && reportId) reportIds.push(reportId)
  }

  return {
    periodsChecked: (periods ?? []).length,
    reportsFinalized: reportIds.length,
    reportIds,
  }
}
