import { createClient } from '../supabase/server'
import type {
  MembershipStatus,
  OrganizationMembershipRow,
} from '../types/identity-access'

const ORGANIZATION_MEMBERSHIP_SELECT_COLUMNS = `
  id,
  organization_id,
  user_id,
  membership_role,
  status,
  display_name,
  invited_by,
  invited_at,
  accepted_at,
  suspended_at,
  removed_at,
  created_at,
  updated_at
`

type OrganizationMembershipResult = {
  membership: OrganizationMembershipRow | null
  error: string | null
}

type OrganizationMembershipsResult = {
  memberships: OrganizationMembershipRow[]
  error: string | null
}

export async function getOrganizationMembershipById(
  membershipId: string
): Promise<OrganizationMembershipResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organization_memberships')
    .select(ORGANIZATION_MEMBERSHIP_SELECT_COLUMNS)
    .eq('id', membershipId)
    .maybeSingle<OrganizationMembershipRow>()

  if (error) {
    return { membership: null, error: error.message }
  }

  return { membership: data, error: null }
}

export async function getOrganizationMembershipsForUser(
  userId: string,
  options?: { status?: MembershipStatus }
): Promise<OrganizationMembershipsResult> {
  const supabase = await createClient()

  let query = supabase
    .from('organization_memberships')
    .select(ORGANIZATION_MEMBERSHIP_SELECT_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) {
    return { memberships: [], error: error.message }
  }

  return {
    memberships: (data ?? []) as OrganizationMembershipRow[],
    error: null,
  }
}

export async function getOrganizationMembershipForUserAndOrganization(
  userId: string,
  organizationId: string,
  options?: { status?: MembershipStatus }
): Promise<OrganizationMembershipResult> {
  const supabase = await createClient()

  let query = supabase
    .from('organization_memberships')
    .select(ORGANIZATION_MEMBERSHIP_SELECT_COLUMNS)
    .eq('user_id', userId)
    .eq('organization_id', organizationId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query.maybeSingle<OrganizationMembershipRow>()

  if (error) {
    return { membership: null, error: error.message }
  }

  return { membership: data, error: null }
}
