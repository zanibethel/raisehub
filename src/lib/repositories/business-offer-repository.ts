import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

/**
 * A single offer record as needed for read-only owner support.
 *
 * Schema notes (inspected from existing queries in business-dashboard.tsx,
 * featured-deals-carousel.tsx, offers/[id]/page.tsx, and dashboard/actions.ts):
 *
 * Confirmed columns: id, business_id, title, discount, description,
 *   is_active, starts_at, ends_at, created_at.
 *
 * Not confirmed in any existing query: is_archived, image_url, terms.
 * The offer-health rule engine references hasTerms and hasImage as booleans
 * computed by the caller rather than direct column names. These fields are
 * excluded here until the actual schema is verified. Add them if confirmed.
 */
export type BusinessOffer = {
  id: string
  business_id: string
  title: string
  discount: string | null
  description: string | null
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
