import type { WorkspaceCardData, WorkspaceRole } from '@/lib/types/identity-access'
import {
  authorizeOwnerWorkspaceRead,
  type OwnerWorkspaceAuthorizationFailureReason,
} from '@/lib/services/owner-workspace-authorization-service'
import { createAdminClient } from '@/lib/supabase/admin'

export type ReadOnlyOrganizationTransfer = {
  id: string
  campaignId: string | null
  amountCents: number
  currency: string
  status: string
  initiatedAt: string | null
  completedAt: string | null
  failedAt: string | null
  failureMessage: string | null
}

export type OwnerOrganizationFinancialsResult =
  | {
      success: true
      workspace: WorkspaceCardData
      summary: {
        passesSold: number
        grossVolume: number
        platformFees: number
        organizationEarnings: number
        donations: number
        transferredCents: number
        pendingTransferCents: number
      }
      transfers: ReadOnlyOrganizationTransfer[]
    }
  | {
      success: false
      reason:
        | OwnerWorkspaceAuthorizationFailureReason
        | 'invalid-workspace-role'
        | 'campaign-lookup-failure'
        | 'purchase-lookup-failure'
        | 'transfer-lookup-failure'
      message: string
    }

type CampaignRow = { id: string }
type PurchaseRow = {
  amount_paid: number | string | null
  platform_fee: number | string | null
  organization_earnings: number | string | null
  donation_amount: number | string | null
}
type TransferRow = {
  id: string
  campaign_id: string | null
  amount_cents: number | string
  currency: string
  status: string
  initiated_at: string | null
  completed_at: string | null
  failed_at: string | null
  failure_message: string | null
}

function numberValue(value: number | string | null | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function isDemoWorkspace(workspace: WorkspaceCardData) {
  return 'isDemo' in workspace && Boolean(workspace.isDemo)
}

export async function getOwnerAuthorizedOrganizationFinancials(
  workspaceId: string,
  workspaceRole: WorkspaceRole
): Promise<OwnerOrganizationFinancialsResult> {
  if (workspaceRole !== 'organization') {
    return {
      success: false,
      reason: 'invalid-workspace-role',
      message: 'Financials are only available for organization workspaces.',
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
  const { data: campaignRows, error: campaignError } = await admin
    .from('campaigns')
    .select('id')
    .or(`organization_id.eq.${workspaceId},canonical_organization_id.eq.${workspaceId}`)

  if (campaignError) {
    return {
      success: false,
      reason: 'campaign-lookup-failure',
      message: 'Unable to resolve organization campaigns for financial reporting.',
    }
  }

  const campaignIds = ((campaignRows ?? []) as CampaignRow[]).map((campaign) => campaign.id)
  let purchases: PurchaseRow[] = []

  if (campaignIds.length > 0) {
    let purchaseQuery = admin
      .from('campaign_purchases')
      .select('amount_paid,platform_fee,organization_earnings,donation_amount')
      .in('campaign_id', campaignIds)

    purchaseQuery = isDemoWorkspace(authorizationResult.workspace)
      ? purchaseQuery.eq('payment_status', 'test_paid').eq('is_demo', true)
      : purchaseQuery.eq('payment_status', 'paid').eq('is_demo', false)

    const { data, error } = await purchaseQuery
    if (error) {
      return {
        success: false,
        reason: 'purchase-lookup-failure',
        message: 'Unable to load organization purchase totals.',
      }
    }
    purchases = (data ?? []) as PurchaseRow[]
  }

  const { data: transferRows, error: transferError } = await admin
    .from('organization_transfers')
    .select('id,campaign_id,amount_cents,currency,status,initiated_at,completed_at,failed_at,failure_message')
    .eq('organization_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (transferError) {
    return {
      success: false,
      reason: 'transfer-lookup-failure',
      message: 'Unable to load organization transfer history.',
    }
  }

  const transfers = ((transferRows ?? []) as TransferRow[]).map((row) => ({
    id: row.id,
    campaignId: row.campaign_id,
    amountCents: Math.round(numberValue(row.amount_cents)),
    currency: row.currency || 'usd',
    status: row.status,
    initiatedAt: row.initiated_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    failureMessage: row.failure_message,
  }))

  return {
    success: true,
    workspace: authorizationResult.workspace,
    summary: {
      passesSold: purchases.length,
      grossVolume: purchases.reduce((sum, row) => sum + numberValue(row.amount_paid), 0),
      platformFees: purchases.reduce((sum, row) => sum + numberValue(row.platform_fee), 0),
      organizationEarnings: purchases.reduce(
        (sum, row) => sum + numberValue(row.organization_earnings),
        0
      ),
      donations: purchases.reduce((sum, row) => sum + numberValue(row.donation_amount), 0),
      transferredCents: transfers
        .filter((transfer) => transfer.status === 'completed')
        .reduce((sum, transfer) => sum + transfer.amountCents, 0),
      pendingTransferCents: transfers
        .filter((transfer) => ['pending', 'processing', 'submitted'].includes(transfer.status))
        .reduce((sum, transfer) => sum + transfer.amountCents, 0),
    },
    transfers,
  }
}
