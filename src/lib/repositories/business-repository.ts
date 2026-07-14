import { createClient } from '../supabase/server'
import type { BusinessRow } from '../types/identity-access'

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
  archived_at
`

type BusinessResult = {
  business: BusinessRow | null
  error: string | null
}

type BusinessesResult = {
  businesses: BusinessRow[]
  error: string | null
}

export async function getBusinessById(
  businessId: string
): Promise<BusinessResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select(BUSINESS_SELECT_COLUMNS)
    .eq('id', businessId)
    .maybeSingle<BusinessRow>()

  if (error) {
    return { business: null, error: error.message }
  }

  return { business: data, error: null }
}

export async function getBusinessByLegacyProfileId(
  legacyProfileId: string
): Promise<BusinessResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select(BUSINESS_SELECT_COLUMNS)
    .eq('legacy_profile_id', legacyProfileId)
    .maybeSingle<BusinessRow>()

  if (error) {
    return { business: null, error: error.message }
  }

  return { business: data, error: null }
}

export async function getBusinessesByIds(
  businessIds: string[]
): Promise<BusinessesResult> {
  if (businessIds.length === 0) {
    return { businesses: [], error: null }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('businesses')
    .select(BUSINESS_SELECT_COLUMNS)
    .in('id', businessIds)

  if (error) {
    return { businesses: [], error: error.message }
  }

  return {
    businesses: (data ?? []) as BusinessRow[],
    error: null,
  }
}
