import { createClient } from '../supabase/server'
import type {
  CampaignMembershipRow,
  MembershipStatus,
} from '../types/identity-access'

const CAMPAIGN_MEMBERSHIP_SELECT_COLUMNS = `
  id,
  campaign_id,
  organization_membership_id,
  referral_code,
  personal_goal,
  status,
  joined_at,
  disabled_at,
  created_at,
  updated_at
`

type CampaignMembershipResult = {
  membership: CampaignMembershipRow | null
  error: string | null
}

type CampaignMembershipsResult = {
  memberships: CampaignMembershipRow[]
  error: string | null
}

export async function getCampaignMembershipById(
  membershipId: string
): Promise<CampaignMembershipResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('campaign_memberships')
    .select(CAMPAIGN_MEMBERSHIP_SELECT_COLUMNS)
    .eq('id', membershipId)
    .maybeSingle<CampaignMembershipRow>()

  if (error) {
    return { membership: null, error: error.message }
  }

  return { membership: data, error: null }
}

export async function getCampaignMembershipsByOrganizationMembershipIds(
  organizationMembershipIds: string[],
  options?: { status?: MembershipStatus }
): Promise<CampaignMembershipsResult> {
  if (organizationMembershipIds.length === 0) {
    return { memberships: [], error: null }
  }

  const supabase = await createClient()

  let query = supabase
    .from('campaign_memberships')
    .select(CAMPAIGN_MEMBERSHIP_SELECT_COLUMNS)
    .in('organization_membership_id', organizationMembershipIds)
    .order('created_at', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) {
    return { memberships: [], error: error.message }
  }

  return {
    memberships: (data ?? []) as CampaignMembershipRow[],
    error: null,
  }
}
