import 'server-only'

import {
  applyEnvironmentScope,
  getActiveDataEnvironment,
  isMissingEnvironmentAwareRpc,
  recordMatchesEnvironment,
  recordsShareEnvironment,
  resolveDataEnvironment,
  toRpcEnvironmentExpectation,
  type DataEnvironment,
} from '@/lib/data-environment'
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
  is_demo: boolean
  demo_group: string | null
}

type OrganizationRow = {
  id: string
  legacy_profile_id: string | null
  name: string
  logo_url: string | null
  is_demo: boolean
  demo_group: string | null
}

type ProfileRow = {
  id: string
  display_name: string | null
  business_name: string | null
  logo_url: string | null
  is_demo: boolean
  demo_group: string | null
}

type ProgressRow = {
  campaign_id: string
  amount_raised: number | null
}

type PublicCampaignMode = 'app' | 'production'

export type PublicSellableCampaignsResult = {
  campaigns: SellableCampaignOption[]
  error: string | null
  errorSource: 'campaigns' | null
}

function getDaysRemaining(endsAt: string | null, now: Date): number | null {
  if (!endsAt) return null
  const endsAtTime = new Date(endsAt).getTime()
  if (Number.isNaN(endsAtTime)) return null
  return Math.max(
    0,
    Math.ceil((endsAtTime - now.getTime()) / (1000 * 60 * 60 * 24))
  )
}

function getGoalState(amountRaised: number, goalAmountValue: number | null) {
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
    goalPercentage: Math.min(100, Math.max(0, (amountRaised / goalAmount) * 100)),
    amountRemaining: Math.max(0, goalAmount - amountRaised),
  }
}

function resolvePublicEnvironment(mode: PublicCampaignMode): DataEnvironment {
  return mode === 'production'
    ? resolveDataEnvironment('production')
    : getActiveDataEnvironment()
}

export async function getPublicSellableCampaigns(
  now = new Date(),
  mode: PublicCampaignMode = 'app'
): Promise<PublicSellableCampaignsResult> {
  const admin = createAdminClient()
  const nowIso = now.toISOString()
  const environment = resolvePublicEnvironment(mode)

  const campaignQuery = admin
    .from('campaigns')
    .select(
      'id, organization_id, name, description, goal_amount, starts_at, ends_at, status, created_at, is_demo, demo_group'
    )
    .eq('status', 'active')
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })

  const { data: campaignData, error: campaignError } =
    await applyEnvironmentScope(campaignQuery, environment)

  if (campaignError) {
    return {
      campaigns: [],
      error: campaignError.message,
      errorSource: 'campaigns',
    }
  }

  // The generated Supabase types lag the live schema's environment columns.
  // Keep the cast isolated here until types are regenerated from the project.
  const campaignRows = (campaignData ?? []) as unknown as CampaignRow[]

  if (campaignRows.length === 0) {
    return { campaigns: [], error: null, errorSource: null }
  }

  const legacyOrganizationIds = [
    ...new Set(campaignRows.map((campaign) => campaign.organization_id)),
  ]

  const organizationQuery = admin
    .from('organizations')
    .select('id, legacy_profile_id, name, logo_url, is_demo, demo_group')
    .in('legacy_profile_id', legacyOrganizationIds)

  const profileQuery = admin
    .from('profiles')
    .select('id, display_name, business_name, logo_url, is_demo, demo_group')
    .in('id', legacyOrganizationIds)
    .eq('role', 'organization')

  const [
    { data: organizationData },
    { data: profileData },
    progressResult,
  ] = await Promise.all([
    applyEnvironmentScope(organizationQuery, environment),
    applyEnvironmentScope(profileQuery, environment),
    admin.rpc('get_public_campaign_progress', {
      p_campaign_ids: campaignRows.map((campaign) => campaign.id),
      ...toRpcEnvironmentExpectation(environment),
    }),
  ])

  let progressData = progressResult.data

  if (
    progressResult.error &&
    isMissingEnvironmentAwareRpc(
      progressResult.error,
      'get_public_campaign_progress'
    )
  ) {
    const fallback = await (admin as any).rpc('get_public_campaign_progress', {
      p_campaign_ids: campaignRows.map((campaign) => campaign.id),
    })
    progressData = fallback.data
  }

  const organizations = (organizationData ?? []) as unknown as OrganizationRow[]
  const profiles = (profileData ?? []) as unknown as ProfileRow[]
  const progress = (progressData ?? []) as ProgressRow[]

  const organizationByLegacyId = new Map(
    organizations
      .filter((organization) => Boolean(organization.legacy_profile_id))
      .map((organization) => [organization.legacy_profile_id as string, organization])
  )

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const amountRaisedByCampaignId = new Map(
    progress.map((row) => [row.campaign_id, Number(row.amount_raised ?? 0)])
  )

  const safeCampaignRows = campaignRows.filter((campaign) => {
    const organization = organizationByLegacyId.get(campaign.organization_id)
    const profile = profileById.get(campaign.organization_id)
    const parent = profile ?? organization

    return (
      Boolean(parent) &&
      recordMatchesEnvironment(parent ?? {}, environment) &&
      recordsShareEnvironment(campaign, parent ?? {})
    )
  })

  const pricingInputs = safeCampaignRows.map((campaign) => {
    const organization = organizationByLegacyId.get(campaign.organization_id)

    return {
      campaignId: campaign.id,
      organizationId: organization?.id ?? null,
      isDemo: campaign.is_demo === true,
    }
  })

  const { pricingByCampaignId } =
    await resolveEffectiveCampaignPricingBatch(pricingInputs, { now })

  const campaigns = safeCampaignRows.map((campaign) => {
    const organization = organizationByLegacyId.get(campaign.organization_id)
    const profile = profileById.get(campaign.organization_id)
    const amountRaised = Number(
      amountRaisedByCampaignId.get(campaign.id) ?? 0
    )
    const goalState = getGoalState(amountRaised, campaign.goal_amount)

    return {
      id: campaign.id,
      organizationId: organization?.id ?? null,
      organizationLegacyProfileId: campaign.organization_id,
      name: campaign.name,
      organizationName:
        profile?.display_name ||
        profile?.business_name ||
        organization?.name ||
        null,
      imageUrl: profile?.logo_url || organization?.logo_url || null,
      amountRaised,
      goalAmount: goalState.goalAmount,
      goalPercentage: goalState.goalPercentage,
      amountRemaining: goalState.amountRemaining,
      endsAt: campaign.ends_at,
      daysRemaining: getDaysRemaining(campaign.ends_at, now),
      createdAt: campaign.created_at,
      passPrice: pricingByCampaignId.get(campaign.id)?.passPrice ?? null,
      description: campaign.description,
      startsAt: campaign.starts_at,
      status: campaign.status,
    } satisfies SellableCampaignOption
  })

  return { campaigns, error: null, errorSource: null }
}
