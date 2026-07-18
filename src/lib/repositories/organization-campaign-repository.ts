import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

/**
 * A single campaign record used for read-only Owner support.
 *
 * Pricing is intentionally excluded. Current campaign pricing is resolved by
 * the managed pricing service rather than read from campaigns.pass_price.
 *
 * Schema ownership field:
 * organization_id references the organization legacy profile ID currently
 * stored on campaign records.
 *
 * RLS (SELECT): An Owner-only SELECT policy already exists.
 * No schema or RLS changes are part of this repository.
 */
export type OrganizationCampaign = {
  id: string
  organization_id: string
  name: string
  description: string | null
  goal_amount: number | null
  starts_at: string | null
  ends_at: string | null
  status: string
  created_at: string
}

type OrganizationCampaignsResult = {
  campaigns: OrganizationCampaign[]
  error: string | null
}

// =============================================================================
// Repository
// =============================================================================

export async function getOrganizationCampaigns(
  organizationProfileId: string
): Promise<OrganizationCampaignsResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .select(
      `
        id,
        organization_id,
        name,
        description,
        goal_amount,
        starts_at,
        ends_at,
        status,
        created_at
      `
    )
    .eq(
      'organization_id',
      organizationProfileId
    )
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    return {
      campaigns: [],
      error: error.message,
    }
  }

  return {
    campaigns:
      (data ?? []) as OrganizationCampaign[],
    error: null,
  }
}