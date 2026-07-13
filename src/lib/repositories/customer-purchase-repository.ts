import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

/**
 * A single campaign_purchase record enriched with related names,
 * as needed for read-only owner support.
 *
 * Schema verified against the RaiseHub Supabase project
 * (public.campaign_purchases):
 *
 *   id                      uuid        NOT NULL
 *   campaign_id             uuid        NOT NULL
 *   user_id                 uuid        NULL
 *   amount_paid             numeric     NOT NULL
 *   donation_amount         numeric     NOT NULL
 *   payment_status          text        NOT NULL
 *   created_at              timestamptz NOT NULL
 *   selected_organization_id uuid       NULL
 *   seller_name             text        NULL
 *
 * RLS: The owner-only SELECT policy (allow_owner_read_customer_activity)
 * was applied as a database prerequisite. No schema or RLS changes are
 * part of this repository.
 *
 * Query strategy:
 * - Supabase relation select loads campaign name via FK on campaign_id.
 * - A secondary profiles lookup loads organization name by
 *   selected_organization_id, matching the existing customer dashboard pattern.
 */

type RawPurchaseRow = {
  id: string
  campaign_id: string
  selected_organization_id: string | null
  amount_paid: number
  donation_amount: number
  payment_status: string
  created_at: string
  campaigns: { name: string } | null
}

export type CustomerPurchaseRecord = {
  id: string
  campaign_id: string
  campaign_name: string | null
  selected_organization_id: string | null
  organization_name: string | null
  amount_paid: number
  donation_amount: number
  payment_status: string
  created_at: string
}

type CustomerPurchasesResult = {
  purchases: CustomerPurchaseRecord[]
  error: string | null
}

// =============================================================================
// Repository
// =============================================================================

export async function getCustomerPurchases(
  customerProfileId: string
): Promise<CustomerPurchasesResult> {
  const supabase = await createClient()

  const { data: rawData, error: purchasesError } = await supabase
    .from('campaign_purchases')
    .select(
      `
        id,
        campaign_id,
        selected_organization_id,
        amount_paid,
        donation_amount,
        payment_status,
        created_at,
        campaigns(name)
      `
    )
    .eq('user_id', customerProfileId)
    .order('created_at', { ascending: false })

  if (purchasesError) {
    return {
      purchases: [],
      error: purchasesError.message,
    }
  }

  const rows = (rawData ?? []) as RawPurchaseRow[]

  // Collect unique organization IDs for a secondary profiles lookup.
  const orgIds = [
    ...new Set(
      rows
        .map((row) => row.selected_organization_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const orgNameById = new Map<string, string>()

  if (orgIds.length > 0) {
    const { data: orgProfiles } = await supabase
      .from('profiles')
      .select('id, display_name, business_name')
      .in('id', orgIds)

    for (const profile of orgProfiles ?? []) {
      const name =
        profile.display_name || profile.business_name || null
      if (name) {
        orgNameById.set(profile.id, name)
      }
    }
  }

  return {
    purchases: rows.map((row) => ({
      id: row.id,
      campaign_id: row.campaign_id,
      campaign_name: row.campaigns?.name ?? null,
      selected_organization_id: row.selected_organization_id,
      organization_name: row.selected_organization_id
        ? (orgNameById.get(row.selected_organization_id) ?? null)
        : null,
      amount_paid: row.amount_paid,
      donation_amount: row.donation_amount,
      payment_status: row.payment_status,
      created_at: row.created_at,
    })),
    error: null,
  }
}
