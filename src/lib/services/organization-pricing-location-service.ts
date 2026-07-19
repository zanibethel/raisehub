import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type OrganizationPricingLocation = {
  townName: string | null
  stateCode: string | null
  lookupFailed: boolean
}

type OrganizationPricingLocationRow = {
  town_name: string | null
  state_code: string | null
}

function normalizeTownName(value: string | null) {
  const normalized = value?.trim() ?? ''

  return normalized || null
}

function normalizeStateCode(value: string | null) {
  const normalized = value?.trim().toUpperCase() ?? ''

  return /^[A-Z]{2}$/.test(normalized)
    ? normalized
    : null
}

export async function getOrganizationPricingLocation(
  organizationId: string | null | undefined
): Promise<OrganizationPricingLocation> {
  const normalizedOrganizationId =
    organizationId?.trim() ?? ''

  if (!normalizedOrganizationId) {
    return {
      townName: null,
      stateCode: null,
      lookupFailed: false,
    }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('organizations')
    .select('town_name, state_code')
    .eq('id', normalizedOrganizationId)
    .maybeSingle()

  if (error) {
    return {
      townName: null,
      stateCode: null,
      lookupFailed: true,
    }
  }

  // The generated database type will be refreshed after the location
  // migration is applied. Keep this narrow cast local until then.
  const location =
    data as unknown as OrganizationPricingLocationRow | null

  return {
    townName: normalizeTownName(
      location?.town_name ?? null
    ),
    stateCode: normalizeStateCode(
      location?.state_code ?? null
    ),
    lookupFailed: false,
  }
}