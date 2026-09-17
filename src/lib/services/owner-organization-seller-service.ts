import type { WorkspaceCardData, WorkspaceRole } from '@/lib/types/identity-access'
import {
  authorizeOwnerWorkspaceRead,
  type OwnerWorkspaceAuthorizationFailureReason,
} from '@/lib/services/owner-workspace-authorization-service'
import { createAdminClient } from '@/lib/supabase/admin'

export type ReadOnlyOrganizationSeller = {
  id: string
  campaignId: string
  campaignName: string
  displayName: string
  status: string
  claimed: boolean
  createdAt: string
  paidSales: number
  grossSales: number
  organizationEarnings: number
}

export type OwnerOrganizationSellersResult =
  | {
      success: true
      workspace: WorkspaceCardData
      sellers: ReadOnlyOrganizationSeller[]
      summary: {
        total: number
        active: number
        claimed: number
        paidSales: number
        grossSales: number
      }
    }
  | {
      success: false
      reason:
        | OwnerWorkspaceAuthorizationFailureReason
        | 'invalid-workspace-role'
        | 'seller-lookup-failure'
        | 'campaign-lookup-failure'
        | 'sales-lookup-failure'
      message: string
    }

type SellerRow = {
  id: string
  campaign_id: string
  display_name: string
  status: string
  seller_profile_id: string | null
  created_at: string
}

type CampaignRow = { id: string; name: string }
type PurchaseRow = {
  campaign_seller_id: string | null
  amount_paid: number | string | null
  organization_earnings: number | string | null
  organization_pass_earnings: number | string | null
}

function numberValue(value: number | string | null | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function isDemoWorkspace(workspace: WorkspaceCardData) {
  return 'isDemo' in workspace && Boolean(workspace.isDemo)
}

export async function getOwnerAuthorizedOrganizationSellers(
  workspaceId: string,
  workspaceRole: WorkspaceRole
): Promise<OwnerOrganizationSellersResult> {
  if (workspaceRole !== 'organization') {
    return {
      success: false,
      reason: 'invalid-workspace-role',
      message: 'Seller activity is only available for organization workspaces.',
    }
  }

  const authorizationResult = await authorizeOwnerWorkspaceRead(workspaceId, workspaceRole)
  if (!authorizationResult.authorized) {
    return {
      success: false,
      reason: authorizationResult.reason,
      message: authorizationResult.message,
    }
  }

  const admin = createAdminClient() as any
  const { data: sellerRows, error: sellerError } = await admin
    .from('campaign_sellers')
    .select('id,campaign_id,display_name,status,seller_profile_id,created_at')
    .eq('organization_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(250)

  if (sellerError) {
    return {
      success: false,
      reason: 'seller-lookup-failure',
      message: 'Unable to load organization seller activity.',
    }
  }

  const sellers = (sellerRows ?? []) as SellerRow[]
  const campaignIds = [...new Set(sellers.map((seller) => seller.campaign_id))]

  let campaignNameById = new Map<string, string>()
  if (campaignIds.length > 0) {
    const { data: campaignRows, error: campaignError } = await admin
      .from('campaigns')
      .select('id,name')
      .in('id', campaignIds)

    if (campaignError) {
      return {
        success: false,
        reason: 'campaign-lookup-failure',
        message: 'Unable to resolve seller campaign names.',
      }
    }

    campaignNameById = new Map(
      ((campaignRows ?? []) as CampaignRow[]).map((campaign) => [campaign.id, campaign.name])
    )
  }

  let purchaseRows: PurchaseRow[] = []
  if (sellers.length > 0) {
    const sellerIds = sellers.map((seller) => seller.id)
    let purchaseQuery = admin
      .from('campaign_purchases')
      .select('campaign_seller_id,amount_paid,organization_earnings,organization_pass_earnings')
      .in('campaign_seller_id', sellerIds)

    purchaseQuery = isDemoWorkspace(authorizationResult.workspace)
      ? purchaseQuery.eq('payment_status', 'test_paid').eq('is_demo', true)
      : purchaseQuery.eq('payment_status', 'paid').eq('is_demo', false)

    const { data, error } = await purchaseQuery
    if (error) {
      return {
        success: false,
        reason: 'sales-lookup-failure',
        message: 'Unable to load seller sales activity.',
      }
    }
    purchaseRows = (data ?? []) as PurchaseRow[]
  }

  const metrics = new Map<string, { count: number; gross: number; earnings: number }>()
  for (const purchase of purchaseRows) {
    if (!purchase.campaign_seller_id) continue
    const current = metrics.get(purchase.campaign_seller_id) ?? { count: 0, gross: 0, earnings: 0 }
    current.count += 1
    current.gross += numberValue(purchase.amount_paid)
    current.earnings += numberValue(
      purchase.organization_pass_earnings ?? purchase.organization_earnings
    )
    metrics.set(purchase.campaign_seller_id, current)
  }

  const mapped = sellers.map((seller) => {
    const sellerMetrics = metrics.get(seller.id) ?? { count: 0, gross: 0, earnings: 0 }
    return {
      id: seller.id,
      campaignId: seller.campaign_id,
      campaignName: campaignNameById.get(seller.campaign_id) ?? 'Campaign',
      displayName: seller.display_name,
      status: seller.status,
      claimed: Boolean(seller.seller_profile_id),
      createdAt: seller.created_at,
      paidSales: sellerMetrics.count,
      grossSales: sellerMetrics.gross,
      organizationEarnings: sellerMetrics.earnings,
    }
  })

  return {
    success: true,
    workspace: authorizationResult.workspace,
    sellers: mapped,
    summary: {
      total: mapped.length,
      active: mapped.filter((seller) => seller.status === 'active').length,
      claimed: mapped.filter((seller) => seller.claimed).length,
      paidSales: mapped.reduce((sum, seller) => sum + seller.paidSales, 0),
      grossSales: mapped.reduce((sum, seller) => sum + seller.grossSales, 0),
    },
  }
}
