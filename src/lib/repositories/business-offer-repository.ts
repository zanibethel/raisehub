import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

/**
 * A single offer record as needed for read-only owner support.
 *
 * Schema verified directly against the RaiseHub Supabase project (public.offers):
 *
 *   id          uuid        NOT NULL
 *   business_id uuid        NOT NULL  — verified ownership field
 *   title       text        NOT NULL
 *   description text        NULL
 *   usage_rule  text        NOT NULL
 *   expires_at  date        NULL
 *   is_active   boolean     NOT NULL
 *   created_at  timestamptz NOT NULL
 *   discount    text        NULL
 *   starts_at   timestamptz NULL
 *   ends_at     timestamptz NULL
 *
 * Confirmed absent: is_archived, image_url, terms — do not add.
 *
 * RLS (SELECT): authenticated users have broad SELECT access via a
 * `qual: true` policy. The owner account can therefore read cross-account
 * offers without bypassing RLS. Filtering by business_id in this repository
 * remains required to scope results to a specific business.
 * No schema or RLS changes are part of this repository.
 */
export type BusinessOffer = {
  id: string
  business_id: string
  title: string
  discount: string | null
  description: string | null
  usage_rule: string
  expires_at: string | null
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

type BusinessOffersResult = {
  offers: BusinessOffer[]
  error: string | null
}

// =============================================================================
// Repository
// =============================================================================

export async function getBusinessOffers(
  businessProfileId: string
): Promise<BusinessOffersResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('offers')
    .select(
      `
        id,
        business_id,
        title,
        discount,
        description,
        usage_rule,
        expires_at,
        is_active,
        starts_at,
        ends_at,
        created_at
      `
    )
    .eq('business_id', businessProfileId)
    .order('created_at', { ascending: false })

  if (error) {
    return {
      offers: [],
      error: error.message,
    }
  }

  return {
    offers: (data ?? []) as BusinessOffer[],
    error: null,
  }
}
