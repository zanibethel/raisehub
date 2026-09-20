'use server'

import { revalidatePath } from 'next/cache'
import { isCampaignPurchaseProgressEligible } from '@/lib/rules/campaign-progress-rules'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type CampaignSellerRosterRow = {
  id: string
  name: string
  status: 'active' | 'inactive' | 'revoked' | 'removed' | 'suspended'
  claimed: boolean
  referralCode: string
  passesSold: number
  grossSales: number
  organizationEarnings: number
  lastSaleAt: string | null
}

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

async function getActorProfileId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

function normalizeRow(row: Record<string, unknown>): CampaignSellerRosterRow {
  return {
    id: String(row.id ?? ''),
    name: String(row.display_name ?? ''),
    status: String(row.status ?? 'inactive') as CampaignSellerRosterRow['status'],
    claimed: Boolean(row.account_claimed),
    referralCode: String(row.referral_code ?? ''),
    passesSold: Number(row.passes_sold ?? 0),
    grossSales: Number(row.gross_sales ?? 0),
    organizationEarnings: Number(row.organization_earnings ?? 0),
    lastSaleAt: row.last_sale_at ? String(row.last_sale_at) : null,
  }
}

export async function listCampaignSellerRosterAction(
  campaignId: string,
): Promise<ActionResult<CampaignSellerRosterRow[]>> {
  const actorProfileId = await getActorProfileId()
  if (!actorProfileId) return { success: false, error: 'You must be signed in to manage this roster.' }
  if (!campaignId.trim()) return { success: false, error: 'Choose a campaign first.' }

  const admin = createAdminClient() as any
  const { data, error } = await admin.rpc('list_campaign_sellers', {
    p_campaign_id: campaignId,
    p_actor_profile_id: actorProfileId,
  })

  if (error) return { success: false, error: error.message || 'The seller roster could not be loaded.' }

  const rows: CampaignSellerRosterRow[] = (data ?? []).map(
    (row: Record<string, unknown>) => normalizeRow(row)
  )
  const sellerIds = rows.map((row) => row.id).filter(Boolean)

  if (sellerIds.length === 0) {
    return { success: true, data: rows }
  }

  const { data: purchaseData, error: purchaseError } = await admin
    .from('campaign_purchases')
    .select('campaign_seller_id, payment_status, amount_paid, organization_earnings, created_at')
    .eq('campaign_id', campaignId)
    .in('campaign_seller_id', sellerIds)

  if (purchaseError) {
    console.error('Unable to recompute seller roster progress:', purchaseError)
    return { success: true, data: rows }
  }

  const metricsBySellerId = new Map<
    string,
    {
      passesSold: number
      grossSales: number
      organizationEarnings: number
      lastSaleAt: string | null
    }
  >()

  for (const purchase of purchaseData ?? []) {
    const sellerId = String(purchase.campaign_seller_id ?? '')
    if (!sellerId || !isCampaignPurchaseProgressEligible(purchase.payment_status)) continue

    const current = metricsBySellerId.get(sellerId) ?? {
      passesSold: 0,
      grossSales: 0,
      organizationEarnings: 0,
      lastSaleAt: null,
    }

    current.passesSold += 1
    current.grossSales += Number(purchase.amount_paid ?? 0)
    current.organizationEarnings += Number(purchase.organization_earnings ?? 0)

    const createdAt = purchase.created_at ? String(purchase.created_at) : null
    if (createdAt && (!current.lastSaleAt || createdAt > current.lastSaleAt)) {
      current.lastSaleAt = createdAt
    }

    metricsBySellerId.set(sellerId, current)
  }

  return {
    success: true,
    data: rows.map((row) => {
      const metrics = metricsBySellerId.get(row.id)
      return metrics ? { ...row, ...metrics } : {
        ...row,
        passesSold: 0,
        grossSales: 0,
        organizationEarnings: 0,
        lastSaleAt: null,
      }
    }),
  }
}

export async function createCampaignSellersAction(
  campaignId: string,
  names: string[],
): Promise<ActionResult<CampaignSellerRosterRow[]>> {
  const actorProfileId = await getActorProfileId()
  if (!actorProfileId) return { success: false, error: 'You must be signed in to manage this roster.' }

  const cleanedNames = names.map((name) => name.trim()).filter(Boolean).slice(0, 1000)
  if (!campaignId.trim()) return { success: false, error: 'Choose a campaign first.' }
  if (cleanedNames.length === 0) return { success: false, error: 'Add at least one seller name.' }

  const admin = createAdminClient() as any
  const { error } = await admin.rpc('create_campaign_sellers', {
    p_campaign_id: campaignId,
    p_actor_profile_id: actorProfileId,
    p_names: cleanedNames,
  })

  if (error) return { success: false, error: error.message || 'The roster entries could not be saved.' }
  revalidatePath('/dashboard')
  return listCampaignSellerRosterAction(campaignId)
}

export async function updateCampaignSellerAction(input: {
  campaignId: string
  campaignSellerId: string
  displayName?: string
  status?: CampaignSellerRosterRow['status']
}): Promise<ActionResult<CampaignSellerRosterRow[]>> {
  const actorProfileId = await getActorProfileId()
  if (!actorProfileId) return { success: false, error: 'You must be signed in to manage this roster.' }

  const admin = createAdminClient() as any
  const { error } = await admin.rpc('update_campaign_seller', {
    p_campaign_seller_id: input.campaignSellerId,
    p_actor_profile_id: actorProfileId,
    p_display_name: input.displayName?.trim() || null,
    p_status: input.status ?? null,
  })

  if (error) return { success: false, error: error.message || 'The seller could not be updated.' }
  revalidatePath('/dashboard')
  return listCampaignSellerRosterAction(input.campaignId)
}
