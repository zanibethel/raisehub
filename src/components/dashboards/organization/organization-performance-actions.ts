'use server'

import {
  buildOrganizationComplianceSnapshot,
  normalizeOrganizationComplianceSnapshot,
  type OrganizationComplianceSnapshot,
} from '@/lib/organizations/compliance-profile'
import { isCampaignPurchaseProgressEligible } from '@/lib/rules/campaign-progress-rules'
import { createClient } from '@/lib/supabase/server'

export type CampaignPerformanceSeller = {
  seller: string
  sold: number
  gross: number
  earnings: number
  lastSaleAt: string | null
}

export type CampaignReportOrganizationContext = OrganizationComplianceSnapshot & {
  source: 'completion_snapshot' | 'current_profile'
}

export type CampaignPerformanceReport = {
  campaignId: string
  campaignName: string
  status: string
  createdAt: string | null
  startsAt: string | null
  endsAt: string | null
  completedAt: string | null
  goalAmount: number
  passesSold: number
  grossRevenue: number
  organizationEarnings: number
  sellerCount: number
  supporterCount: number
  organizationContext: CampaignReportOrganizationContext | null
  sellers: CampaignPerformanceSeller[]
}

type CampaignRow = {
  id: string
  name: string
  status: string
  created_at: string | null
  starts_at: string | null
  ends_at: string | null
  completed_at: string | null
  completion_snapshot: unknown
  goal_amount: number | null
  organization_id: string
  canonical_organization_id: string | null
}

type OrganizationReportRow = {
  name: string | null
  organization_type: string | null
  town_name: string | null
  state_code: string | null
  compliance_profile: unknown
}

type PurchaseRow = {
  id: string
  user_id: string | null
  buyer_email: string | null
  amount_paid: number
  organization_earnings: number
  refunded_amount_cents: number | null
  refunded_organization_amount_cents: number | null
  seller_name: string | null
  payment_status: string
  created_at: string | null
}

function isReportablePurchase(purchase: PurchaseRow) {
  return (
    isCampaignPurchaseProgressEligible(purchase.payment_status) ||
    purchase.payment_status?.trim().toLowerCase() === 'partially_refunded'
  )
}

function netAmounts(purchase: PurchaseRow) {
  return {
    gross: Math.max(
      Number(purchase.amount_paid ?? 0) - Number(purchase.refunded_amount_cents ?? 0) / 100,
      0
    ),
    earnings: Math.max(
      Number(purchase.organization_earnings ?? 0) -
        Number(purchase.refunded_organization_amount_cents ?? 0) / 100,
      0
    ),
  }
}

function supporterKey(purchase: PurchaseRow) {
  if (purchase.user_id) return `user:${purchase.user_id}`
  if (purchase.buyer_email) return `email:${purchase.buyer_email.toLowerCase()}`
  return `guest:${purchase.id}`
}

export async function loadCampaignPerformanceReportAction(
  campaignId: string
): Promise<{ success: true; data: CampaignPerformanceReport } | { success: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Sign in to view this report.' }

  const { data: campaign, error: campaignError } = await (supabase.from('campaigns') as any)
    .select(
      'id, name, status, created_at, starts_at, ends_at, completed_at, completion_snapshot, goal_amount, organization_id, canonical_organization_id'
    )
    .eq('id', campaignId)
    .maybeSingle()

  if (campaignError || !campaign) {
    return { success: false, error: 'Campaign report was not found.' }
  }

  const reportCampaign = campaign as CampaignRow
  let authorized = reportCampaign.organization_id === user.id

  if (!authorized && reportCampaign.canonical_organization_id) {
    const [{ data: organization }, { data: membership }] = await Promise.all([
      supabase
        .from('organizations')
        .select('legacy_profile_id')
        .eq('id', reportCampaign.canonical_organization_id)
        .maybeSingle<{ legacy_profile_id: string | null }>(),
      supabase
        .from('organization_memberships')
        .select('membership_role, status')
        .eq('organization_id', reportCampaign.canonical_organization_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle<{ membership_role: string; status: string }>(),
    ])

    authorized =
      organization?.legacy_profile_id === user.id ||
      membership?.membership_role === 'admin' ||
      membership?.membership_role === 'manager'
  }

  if (!authorized) return { success: false, error: 'You do not have access to this campaign report.' }

  let organizationContext: CampaignReportOrganizationContext | null = null
  const completionSnapshot = normalizeOrganizationComplianceSnapshot(
    reportCampaign.completion_snapshot
  )

  if (completionSnapshot) {
    organizationContext = {
      ...completionSnapshot,
      source: 'completion_snapshot',
    }
  } else if (reportCampaign.canonical_organization_id) {
    const { data: organizationData } = await (supabase.from('organizations') as any)
      .select('name, organization_type, town_name, state_code, compliance_profile')
      .eq('id', reportCampaign.canonical_organization_id)
      .maybeSingle()

    if (organizationData) {
      const organization = organizationData as OrganizationReportRow
      organizationContext = {
        ...buildOrganizationComplianceSnapshot({
          organizationName: organization.name,
          organizationType: organization.organization_type,
          townName: organization.town_name,
          stateCode: organization.state_code,
          complianceProfile: organization.compliance_profile,
          capturedAt: new Date().toISOString(),
        }),
        source: 'current_profile',
      }
    }
  }

  const { data, error } = await (supabase.from('campaign_purchases') as any)
    .select(
      'id, user_id, buyer_email, amount_paid, organization_earnings, refunded_amount_cents, refunded_organization_amount_cents, seller_name, payment_status, created_at'
    )
    .eq('campaign_id', campaignId)

  if (error) return { success: false, error: 'Campaign results could not be loaded.' }

  const purchases = ((data ?? []) as PurchaseRow[]).filter(isReportablePurchase)
  const supporters = new Set(purchases.map(supporterKey))
  const sellerStats = new Map<
    string,
    { sold: number; gross: number; earnings: number; lastSaleAt: string | null }
  >()

  let grossRevenue = 0
  let organizationEarnings = 0

  for (const purchase of purchases) {
    const net = netAmounts(purchase)
    grossRevenue += net.gross
    organizationEarnings += net.earnings

    const seller = purchase.seller_name?.trim()
    if (!seller) continue

    const existing = sellerStats.get(seller) ?? {
      sold: 0,
      gross: 0,
      earnings: 0,
      lastSaleAt: null,
    }
    existing.sold += 1
    existing.gross += net.gross
    existing.earnings += net.earnings
    if (
      purchase.created_at &&
      (!existing.lastSaleAt || new Date(purchase.created_at) > new Date(existing.lastSaleAt))
    ) {
      existing.lastSaleAt = purchase.created_at
    }
    sellerStats.set(seller, existing)
  }

  const sellers = [...sellerStats.entries()]
    .map(([seller, stats]) => ({ seller, ...stats }))
    .sort(
      (first, second) =>
        second.sold - first.sold || second.gross - first.gross || first.seller.localeCompare(second.seller)
    )

  return {
    success: true,
    data: {
      campaignId: reportCampaign.id,
      campaignName: reportCampaign.name,
      status: reportCampaign.status,
      createdAt: reportCampaign.created_at,
      startsAt: reportCampaign.starts_at,
      endsAt: reportCampaign.ends_at,
      completedAt: reportCampaign.completed_at,
      goalAmount: Number(reportCampaign.goal_amount ?? 0),
      passesSold: purchases.length,
      grossRevenue,
      organizationEarnings,
      sellerCount: sellers.length,
      supporterCount: supporters.size,
      organizationContext,
      sellers,
    },
  }
}
