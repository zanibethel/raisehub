import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

/**
 * A single redemption record enriched with related offer and business names,
 * as needed for read-only owner support.
 *
 * Schema verified against the RaiseHub Supabase project (public.redemptions):
 *
 *   id         uuid        NOT NULL
 *   offer_id   uuid        NULL
 *   user_id    uuid        NULL
 *   created_at timestamptz NULL
 *
 * RLS: The owner-only SELECT policy (allow_owner_read_customer_activity)
 * was applied as a database prerequisite. No schema or RLS changes are
 * part of this repository.
 *
 * Nullable fields:
 * - offer_id may be null; the offers relation is omitted in that case.
 * - created_at may be null; callers must handle null timestamps safely.
 *
 * Query strategy:
 * - Supabase relation select loads offer title and business_id via FK on offer_id.
 * - A secondary profiles lookup loads business name by business_id.
 * - Null offer_id produces a null offers relation, handled in mapping.
 */

type RawRedemptionRow = {
  id: string
  offer_id: string | null
  created_at: string | null
  offers: { title: string; business_id: string } | null
}

export type CustomerRedemptionRecord = {
  id: string
  offer_id: string | null
  offer_title: string | null
  business_name: string | null
  created_at: string | null
}

type CustomerRedemptionsResult = {
  redemptions: CustomerRedemptionRecord[]
  error: string | null
}

// =============================================================================
// Repository
// =============================================================================

export async function getCustomerRedemptions(
  customerProfileId: string
): Promise<CustomerRedemptionsResult> {
  const supabase = await createClient()

  const { data: rawData, error: redemptionsError } = await supabase
    .from('redemptions')
    .select(
      `
        id,
        offer_id,
        created_at,
        offers(title, business_id)
      `
    )
    .eq('user_id', customerProfileId)
    .order('created_at', { ascending: false })

  if (redemptionsError) {
    return {
      redemptions: [],
      error: redemptionsError.message,
    }
  }

  const rows = (rawData ?? []) as unknown as RawRedemptionRow[]

  // Collect unique business IDs for a secondary profiles lookup.
  const businessIds = [
    ...new Set(
      rows
        .map((row) => row.offers?.business_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const businessNameById = new Map<string, string>()

  if (businessIds.length > 0) {
    const { data: businessProfiles, error: businessProfilesError } = await supabase
      .from('profiles')
      .select('id, business_name')
      .in('id', businessIds)

    if (businessProfilesError) {
      return {
        redemptions: [],
        error: businessProfilesError.message,
      }
    }

    for (const profile of businessProfiles ?? []) {
      if (profile.business_name) {
        businessNameById.set(profile.id, profile.business_name)
      }
    }
  }

  return {
    redemptions: rows.map((row) => ({
      id: row.id,
      offer_id: row.offer_id,
      offer_title: row.offers?.title ?? null,
      business_name: row.offers?.business_id
        ? (businessNameById.get(row.offers.business_id) ?? null)
        : null,
      created_at: row.created_at,
    })),
    error: null,
  }
}
