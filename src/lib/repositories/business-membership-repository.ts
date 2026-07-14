import { createClient } from '../supabase/server'
import type {
  BusinessMembershipRow,
  MembershipStatus,
} from '../types/identity-access'

const BUSINESS_MEMBERSHIP_SELECT_COLUMNS = `
  id,
  business_id,
  user_id,
  membership_role,
  status,
  invited_by,
  invited_at,
  accepted_at,
  suspended_at,
  removed_at,
  created_at,
  updated_at
`

type BusinessMembershipResult = {
  membership: BusinessMembershipRow | null
  error: string | null
}

type BusinessMembershipsResult = {
  memberships: BusinessMembershipRow[]
  error: string | null
}

export async function getBusinessMembershipsForUser(
  userId: string,
  options?: { status?: MembershipStatus }
): Promise<BusinessMembershipsResult> {
  const supabase = await createClient()

  let query = supabase
    .from('business_memberships')
    .select(BUSINESS_MEMBERSHIP_SELECT_COLUMNS)
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
    memberships: (data ?? []) as BusinessMembershipRow[],
    error: null,
  }
}

export async function getBusinessMembershipForUserAndBusiness(
  userId: string,
  businessId: string,
  options?: { status?: MembershipStatus }
): Promise<BusinessMembershipResult> {
  const supabase = await createClient()

  let query = supabase
    .from('business_memberships')
    .select(BUSINESS_MEMBERSHIP_SELECT_COLUMNS)
    .eq('user_id', userId)
    .eq('business_id', businessId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query.maybeSingle<BusinessMembershipRow>()

  if (error) {
    return { membership: null, error: error.message }
  }

  return { membership: data, error: null }
}
