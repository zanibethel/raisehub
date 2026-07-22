import 'server-only'

import { resolveEffectiveCampaignPricingBatch } from '@/lib/services/pricing-resolution-service'
import { createAdminClient } from '@/lib/supabase/admin'

import type { SellableCampaignOption } from '@/lib/types/campaigns'

type CampaignRow = {
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

type OrganizationRow = {
  id: string
  legacy_profile_id: string | null
  name: string
  logo_url: string | null
}

type ProfileRow = {
  id: string
  display_name: string | null
  business_name: string | null
  logo_url: string | null
  is_demo: boolean
}

type ProgressRow = {
  campaign_id: string
  amount_raised: number | null
}

export type PublicSellableCampaignsResult = {
  campaigns: SellableCampaignOption[]
  error: string | null
  errorSource: 'campaigns' | null
}

function getDaysRemaining(
  endsAt: string | null,
  now: Date
): number | null {
  if (!endsAt) {
    return null
  }

  const endsAtTime = new Date(endsAt).getTime()

  if (Number.isNaN(endsAtTime)) {
    return null
  }

  return Math.max(
    0,
    Math.ceil(
      (endsAtTime - now.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  )
}

function getGoalState(
  amountRaised: number,
  goalAmountValue: number | null
) {
  const goalAmount = Number(goalAmountValue ?? 0)

  if (!Number.isFinite(goalAmount) || goalAmount <= 0) {
    return {
      goalAmount: null,
      goalPercentage: null,
      amountRemaining: null,
    }
  }

  return {
    goalAmount,
    goalPercentage: Math.min(
      100,
      Math.max(0, (amountRaised / goalAmount) * 100)
    ),
    amountRemaining: Math.max(
      0,
      goalAmount - amountRaised
    ),
  }
}

/**
 * Loads only active, currently sellable campaign data for public discovery.
 *
 * This server-only query intentionally uses the admin client so logged-out
 * visitors are not dependent on authenticated RLS state. Every table query is
 * explicitly limited to the fields needed by public campaign cards.
 */
export async function getPublicSellableCampaigns(
  now = new Date()
): Promise<PublicSellableCampaignsResult> {
  const admin = createAdminClient()
  const nowIso = now.toISOString()

  const { data: campaignData, error: campaignError } =
    await admin
      .from('campaigns')
      .select(
        'id, organization_id, name, description, goal_amount, starts_at, ends_at, status, created_at'
      )
      .eq('status', 'active')
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })

  if (campaignError) {
    return {
      campaigns: [],
      error: campaignError.message,
      errorSource: 'campaigns',
    }
  }

  const campaignRows =
    (campaignData ?? []) as CampaignRow[]

  if (campaignRows.length === 0) {
    return {
      campaigns: [],
      error: null,
      errorSource: null,
    }
  }

  const legacyOrganizationIds = [
    ...new Set(
      campaignRows.map(
        (campaign) => campaign.organization_id
      )
    ),
  ]

  const [
    { data: organizationData },
    { data: profileData },
    { data: progressData },
  ] = await Promise.all([
    admin
      .from('organizations')
      .select('id, legacy_profile_id, name, logo_url')
      .in('legacy_profile_id', legacyOrganizationIds),
    admin
      .from('profiles')
      .select(
        'id, display_name, business_name, logo_url, is_demo'
      )
      .in('id', legacyOrganizationIds)
      .eq('role', 'organization'),
    admin.rpc('get_public_campaign_progress', {
      p_campaign_ids: campaignRows.map(
        (campaign) => campaign.id
      ),
    }),
  ])

  const organizations =
    (organizationData ?? []) as OrganizationRow[]
  const profiles =
    (profileData ?? []) as ProfileRow[]
  const progress =
    (progressData ?? []) as ProgressRow[]

  const organizationByLegacyId = new Map(
    organizations
      .filter(
        (organization) =>
          Boolean(organization.legacy_profile_id)
      )
      .map((organization) => [
        organization.legacy_profile_id as string,
        organization,
      ])
  )

  const profileById = new Map(
    profiles.map((profile) => [profile.id, profile])
  )

  const amountRaisedByCampaignId = new Map(
    progress.map((row) => [
      row.campaign_id,
      Number(row.amount_raised ?? 0),
    ])
  )

  const pricingInputs = campaignRows.map((campaign) => {
    const organization =
      organizationByLegacyId.get(
        campaign.organization_id
      )
    const profile = profileById.get(
      campaign.organization_id
    )

    return {
      campaignId: campaign.id,
      organizationId: organization?.id ?? null,
      isDemo: profile?.is_demo ?? false,
    }
  })

  const { pricingByCampaignId } =
    await resolveEffectiveCampaignPricingBatch(
      pricingInputs,
      { now }
    )

  const campaigns = campaignRows.map((campaign) => {
    const organization =
      organizationByLegacyId.get(
        campaign.organization_id
      )
    const profile = profileById.get(
      campaign.organization_id
    )
    const amountRaised = Number(
      amountRaisedByCampaignId.get(campaign.id) ?? 0
    )
    const goalState = getGoalState(
      amountRaised,
      campaign.goal_amount
    )

    return {
      id: campaign.id,
      organizationId: organization?.id ?? null,
      organizationLegacyProfileId:
        campaign.organization_id,
      name: campaign.name,
      organizationName:
        profile?.display_name ||
        profile?.business_name ||
        organization?.name ||
        null,
      imageUrl:
        profile?.logo_url ||
        organization?.logo_url ||
        null,
      amountRaised,
      goalAmount: goalState.goalAmount,
      goalPercentage: goalState.goalPercentage,
      amountRemaining: goalState.amountRemaining,
      endsAt: campaign.ends_at,
      daysRemaining: getDaysRemaining(
        campaign.ends_at,
        now
      ),
      createdAt: campaign.created_at,
      passPrice:
        pricingByCampaignId.get(campaign.id)
          ?.passPrice ?? null,
      description: campaign.description,
      startsAt: campaign.starts_at,
      status: campaign.status,
    } satisfies SellableCampaignOption
  })

  return {
    campaigns,
    error: null,
    errorSource: null,
  }
}
