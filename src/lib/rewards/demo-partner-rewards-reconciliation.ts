import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  reconcilePartnerRewardsBusiness,
  reconcilePartnerRewardsNetwork,
  type PartnerRewardsNetworkReconcileResult,
  type PartnerRewardsReconcileResult,
} from '@/lib/rewards/partner-rewards-reconciliation'

export type DemoRewardsNetworkReconcileResult = PartnerRewardsNetworkReconcileResult

export async function reconcileDemoPartnerRewards(
  businessId: string | null
): Promise<PartnerRewardsReconcileResult> {
  return reconcilePartnerRewardsBusiness(businessId)
}

export async function reconcileDemoPartnerRewardsNetwork(
  businessId: string | null
): Promise<PartnerRewardsNetworkReconcileResult> {
  return reconcilePartnerRewardsNetwork(businessId)
}

export async function reconcileDemoPartnerRewardsGroup(
  demoGroup: string | null
): Promise<PartnerRewardsNetworkReconcileResult> {
  const normalizedGroup = demoGroup?.trim()

  if (!normalizedGroup) {
    return {
      skipped: true,
      isDemo: true,
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
    .eq('is_demo', true)
    .eq('demo_group', normalizedGroup)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error) throw error

  if (!data?.id) {
    return {
      skipped: true,
      isDemo: true,
      demoGroup: normalizedGroup,
      businessesChecked: 0,
      businessesReconciled: 0,
      reconciledAt: null,
    }
  }

  return reconcilePartnerRewardsNetwork(data.id)
}
