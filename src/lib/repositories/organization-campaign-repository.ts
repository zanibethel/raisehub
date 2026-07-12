import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

/**
 * A single campaign record as needed for read-only owner support.
 *
 * Schema verified directly against the RaiseHub Supabase project
 * (public.campaigns):
 *
 *   id              uuid        NOT NULL
 *   organization_id uuid        NOT NULL  — verified ownership field
 *   name            text        NOT NULL
 *   description     text        NULL
 *   goal_amount     numeric     NULL
 *   pass_price      numeric     NULL
 *   starts_at       date        NULL
 *   ends_at         date        NULL
 *   status          text        NOT NULL
 *   created_at      timestamptz NOT NULL
 *
 * RLS (SELECT): An owner-only SELECT policy already exists.
 * Policy: "Owners can view all campaigns"
 * No schema or RLS changes are part of this repository.
 */
export type OrganizationCampaign = {
  id: string
  organization_id: string
  name: string
  description: string | null
  goal_amount: number | null
  pass_price: number | null
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
        pass_price,
        starts_at,
        ends_at,
        status,
        created_at
      `
    )
    .eq('organization_id', organizationProfileId)
    .order('created_at', { ascending: false })

  if (error) {
    return {
      campaigns: [],
      error: error.message,
    }
  }

  return {
    campaigns: (data ?? []) as OrganizationCampaign[],
    error: null,
  }
}
