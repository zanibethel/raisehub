import { createClient } from '../supabase/server'
import type { OrganizationRow } from '../types/identity-access'

const ORGANIZATION_SELECT_COLUMNS = `
  id,
  legacy_profile_id,
  name,
  description,
  organization_type,
  logo_url,
  phone,
  email,
  website_url,
  status,
  created_by,
  created_at,
  updated_at,
  archived_at
`

type OrganizationResult = {
  organization: OrganizationRow | null
  error: string | null
}

type OrganizationsResult = {
  organizations: OrganizationRow[]
  error: string | null
}

export async function getOrganizationById(
  organizationId: string
): Promise<OrganizationResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select(ORGANIZATION_SELECT_COLUMNS)
    .eq('id', organizationId)
    .maybeSingle<OrganizationRow>()

  if (error) {
    return { organization: null, error: error.message }
  }

  return { organization: data, error: null }
}

export async function getOrganizationByLegacyProfileId(
  legacyProfileId: string
): Promise<OrganizationResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select(ORGANIZATION_SELECT_COLUMNS)
    .eq('legacy_profile_id', legacyProfileId)
    .maybeSingle<OrganizationRow>()

  if (error) {
    return { organization: null, error: error.message }
  }

  return { organization: data, error: null }
}

export async function getOrganizationsByIds(
  organizationIds: string[]
): Promise<OrganizationsResult> {
  if (organizationIds.length === 0) {
    return { organizations: [], error: null }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select(ORGANIZATION_SELECT_COLUMNS)
    .in('id', organizationIds)

  if (error) {
    return { organizations: [], error: error.message }
  }

  return {
    organizations: (data ?? []) as OrganizationRow[],
    error: null,
  }
}
