import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

/**
 * A single saved_offer record enriched with related offer and business names,
 * as needed for read-only owner support.
 *
 * Schema verified against the RaiseHub Supabase project (public.saved_offers):
 *
 *   id         uuid        NOT NULL
 *   user_id    uuid        NOT NULL
 *   offer_id   uuid        NOT NULL
 *   created_at timestamptz NOT NULL
 *
 * RLS: The owner-only SELECT policy (allow_owner_read_customer_activity)
 * was applied as a database prerequisite. No schema or RLS changes are
 * part of this repository.
 *
 * Query strategy:
 * - Supabase relation select loads offer title and business_id via FK on offer_id.
 * - A secondary profiles lookup loads business name by business_id.
 */

type RawSavedOfferRow = {
  id: string
  offer_id: string
  created_at: string
  offers: { title: string; business_id: string } | null
}

export type CustomerSavedOfferRecord = {
  id: string
  offer_id: string
  offer_title: string | null
  business_name: string | null
  created_at: string
}

type CustomerSavedOffersResult = {
  savedOffers: CustomerSavedOfferRecord[]
  error: string | null
}

// =============================================================================
// Repository
// =============================================================================

export async function getCustomerSavedOffers(
  customerProfileId: string
): Promise<CustomerSavedOffersResult> {
  const supabase = await createClient()

  const { data: rawData, error: savedOffersError } = await supabase
    .from('saved_offers')
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

  if (savedOffersError) {
    return {
      savedOffers: [],
      error: savedOffersError.message,
    }
  }

  const rows = (rawData ?? []) as unknown as RawSavedOfferRow[]

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
    const { data: businessProfiles } = await supabase
      .from('profiles')
      .select('id, business_name')
      .in('id', businessIds)

    for (const profile of businessProfiles ?? []) {
      if (profile.business_name) {
        businessNameById.set(profile.id, profile.business_name)
      }
    }
  }

  return {
    savedOffers: rows.map((row) => ({
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
