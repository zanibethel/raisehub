import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'
import {
  authorizeOwnerWorkspaceRead,
  type OwnerWorkspaceAuthorizationFailureReason,
} from '@/lib/services/owner-workspace-authorization-service'
import { createAdminClient } from '@/lib/supabase/admin'

export type ReadOnlyBusinessRedemption = {
  id: string
  offerId: string
  offerTitle: string
  benefit: string | null
  customerValue: number | null
  usageRule: string | null
  status: string
  confirmationMethod: string | null
  createdAt: string
  autoConfirmAt: string | null
  confirmedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
}

export type OwnerBusinessRedemptionsResult =
  | {
      success: true
      workspace: WorkspaceCardData
      redemptions: ReadOnlyBusinessRedemption[]
      summary: {
        total: number
        pending: number
        confirmed: number
        rejected: number
      }
    }
  | {
      success: false
      reason:
        | OwnerWorkspaceAuthorizationFailureReason
        | 'invalid-workspace-role'
        | 'business-lookup-failure'
        | 'redemption-lookup-failure'
      message: string
    }

type CanonicalBusiness = {
  id: string
  legacy_profile_id: string | null
  is_demo: boolean | null
  demo_group: string | null
}

type RedemptionRow = {
  id: string
  offer_id: string
  offer_title_snapshot: string | null
  benefit_snapshot: string | null
  customer_value_snapshot: number | string | null
  usage_rule_snapshot: string | null
  status: string | null
  confirmation_method: string | null
  created_at: string
  auto_confirm_at: string | null
  confirmed_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
}

function toNumber(value: number | string | null): number | null {
  if (value === null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapRedemption(row: RedemptionRow): ReadOnlyBusinessRedemption {
  return {
    id: row.id,
    offerId: row.offer_id,
    offerTitle: row.offer_title_snapshot?.trim() || 'Offer redemption',
    benefit: row.benefit_snapshot,
    customerValue: toNumber(row.customer_value_snapshot),
    usageRule: row.usage_rule_snapshot,
    status: row.status?.trim() || 'unknown',
    confirmationMethod: row.confirmation_method,
    createdAt: row.created_at,
    autoConfirmAt: row.auto_confirm_at,
    confirmedAt: row.confirmed_at,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
  }
}

export async function getOwnerAuthorizedBusinessRedemptions(
  workspaceId: string,
  workspaceRole: WorkspaceRole
): Promise<OwnerBusinessRedemptionsResult> {
  if (workspaceRole !== 'business') {
    return {
      success: false,
      reason: 'invalid-workspace-role',
      message: 'Business redemptions are only available for business workspaces.',
    }
  }

  const authorizationResult = await authorizeOwnerWorkspaceRead(
    workspaceId,
    workspaceRole
  )

  if (!authorizationResult.authorized) {
    return {
      success: false,
      reason: authorizationResult.reason,
      message: authorizationResult.message,
    }
  }

  const admin = createAdminClient() as any
  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('id,legacy_profile_id,is_demo,demo_group')
    .eq('id', workspaceId)
    .maybeSingle()

  if (businessError || !business) {
    return {
      success: false,
      reason: 'business-lookup-failure',
      message: 'Unable to load the business record for redemption history.',
    }
  }

  const typedBusiness = business as CanonicalBusiness
  const profileIds = [typedBusiness.id, typedBusiness.legacy_profile_id].filter(
    (value): value is string => Boolean(value)
  )

  let query = admin
    .from('redemptions')
    .select(
      'id,offer_id,offer_title_snapshot,benefit_snapshot,customer_value_snapshot,usage_rule_snapshot,status,confirmation_method,created_at,auto_confirm_at,confirmed_at,rejected_at,rejection_reason'
    )
    .in('business_profile_id', profileIds)
    .order('created_at', { ascending: false })
    .limit(100)

  if (typedBusiness.is_demo) {
    query = query.eq('is_demo', true)
    if (typedBusiness.demo_group) {
      query = query.eq('demo_group', typedBusiness.demo_group)
    }
  } else {
    query = query.eq('is_demo', false).is('demo_group', null)
  }

  const { data, error } = await query

  if (error) {
    return {
      success: false,
      reason: 'redemption-lookup-failure',
      message: 'Unable to load business redemption history.',
    }
  }

  const redemptions = ((data ?? []) as RedemptionRow[]).map(mapRedemption)

  return {
    success: true,
    workspace: authorizationResult.workspace,
    redemptions,
    summary: {
      total: redemptions.length,
      pending: redemptions.filter((item) => item.status === 'pending').length,
      confirmed: redemptions.filter((item) => item.status === 'confirmed').length,
      rejected: redemptions.filter((item) => item.status === 'rejected').length,
    },
  }
}
