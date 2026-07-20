import { createClient } from '../supabase/server'
import type { BusinessRow } from '../types/identity-access'

// =============================================================================
// Business location and Google metadata
// =============================================================================

export type BusinessLocationSource =
  | 'manual'
  | 'current_location'
  | 'google_place'

export type BusinessLocationData = {
  address: string | null
  latitude: number | null
  longitude: number | null
  location_source: BusinessLocationSource | null
  location_updated_at: string | null
  google_place_id: string | null
  google_business_name: string | null
  google_formatted_address: string | null
  google_phone: string | null
  google_website_url: string | null
  google_maps_url: string | null
  google_primary_category: string | null
  google_rating: number | null
  google_review_count: number | null
  google_details_synced_at: string | null
}

export type BusinessWithLocation =
  BusinessRow & BusinessLocationData

// =============================================================================
// Shared business selection
// =============================================================================

const BUSINESS_SELECT_COLUMNS = `
  id,
  legacy_profile_id,
  name,
  legal_name,
  description,
  category,
  logo_url,
  phone,
  email,
  website_url,
  status,
  subscription_tier,
  created_by,
  created_at,
  updated_at,
  archived_at,
  address,
  latitude,
  longitude,
  location_source,
  location_updated_at,
  google_place_id,
  google_business_name,
  google_formatted_address,
  google_phone,
  google_website_url,
  google_maps_url,
  google_primary_category,
  google_rating,
  google_review_count,
  google_details_synced_at
`

// =============================================================================
// Repository result types
// =============================================================================

type BusinessResult = {
  business: BusinessWithLocation | null
  error: string | null
}

type BusinessesResult = {
  businesses: BusinessWithLocation[]
  error: string | null
}

// =============================================================================
// Repository queries
// =============================================================================

export async function getBusinessById(
  businessId: string
): Promise<BusinessResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select(BUSINESS_SELECT_COLUMNS)
    .eq('id', businessId)
    .maybeSingle<BusinessWithLocation>()

  if (error) {
    return {
      business: null,
      error: error.message,
    }
  }

  return {
    business: data,
    error: null,
  }
}

export async function getBusinessByLegacyProfileId(
  legacyProfileId: string
): Promise<BusinessResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select(BUSINESS_SELECT_COLUMNS)
    .eq('legacy_profile_id', legacyProfileId)
    .maybeSingle<BusinessWithLocation>()

  if (error) {
    return {
      business: null,
      error: error.message,
    }
  }

  return {
    business: data,
    error: null,
  }
}

export async function getBusinessesByIds(
  businessIds: string[]
): Promise<BusinessesResult> {
  if (businessIds.length === 0) {
    return {
      businesses: [],
      error: null,
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select(BUSINESS_SELECT_COLUMNS)
    .in('id', businessIds)

  if (error) {
    return {
      businesses: [],
      error: error.message,
    }
  }

  return {
    businesses:
      (data ?? []) as BusinessWithLocation[],
    error: null,
  }
}