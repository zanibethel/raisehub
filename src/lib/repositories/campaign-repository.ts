import { createClient } from '../supabase/server'
import {
  buildSellableCampaignOption,
  compareSellableCampaignOptions,
  isCampaignPurchaseProgressEligible,
} from '../rules/campaign-progress-rules'
import type { CampaignRow } from '../types/identity-access'
import type {
  SellableCampaignOption,
  SellableCampaignQueryOptions,
} from '../types/campaigns'

const CAMPAIGN_SELECT_COLUMNS = `
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

type CampaignResult = {
  campaign: CampaignRow | null
  error: string | null
}

type SellableCampaignsResult = {
  campaigns: SellableCampaignOption[]
  error: string | null
}

type OrganizationLookupRow = {
  id: string
  legacy_profile_id: string | null
  name: string
  logo_url: string | null
}

type CampaignPurchaseProgressRow = {
  campaign_id: string
  organization_earnings: number | null
  payment_status: string
}

type CampaignMembershipLookupRow = {
  campaign_id: string
}

async function resolveOrganizationLegacyProfileId(
  organizationId: string
): Promise<{
  organizationId: string | null
  organizationLegacyProfileId: string | null
  organizationName: string | null
  imageUrl: string | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('id, legacy_profile_id, name, logo_url')
    .eq('id', organizationId)
    .maybeSingle<OrganizationLookupRow>()

  if (error) {
    return {
      organizationId: null,
      organizationLegacyProfileId: null,
      organizationName: null,
      imageUrl: null,
      error: error.message,
    }
  }

  return {
    organizationId: data?.id ?? null,
    organizationLegacyProfileId: data?.legacy_profile_id ?? null,
    organizationName: data?.name ?? null,
    imageUrl: data?.logo_url ?? null,
    error: null,
  }
}

export async function getCampaignById(
  campaignId: string
): Promise<CampaignResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_SELECT_COLUMNS)
    .eq('id', campaignId)
    .maybeSingle<CampaignRow>()

  if (error) {
    return { campaign: null, error: error.message }
  }

  return { campaign: data, error: null }
}

export async function getSellableCampaigns(
  options: SellableCampaignQueryOptions = {}
): Promise<SellableCampaignsResult> {
  const supabase = await createClient()
  const now = options.now ?? new Date()
  const nowIso = now.toISOString()

  let organizationLegacyProfileId =
    options.organizationLegacyProfileId ?? null
  const organizationByLegacyProfileId = new Map<string, OrganizationLookupRow>()

  if (!organizationLegacyProfileId && options.organizationId) {
    const resolvedOrganization = await resolveOrganizationLegacyProfileId(
      options.organizationId
    )

    if (resolvedOrganization.error) {
      return { campaigns: [], error: resolvedOrganization.error }
    }

    if (!resolvedOrganization.organizationLegacyProfileId) {
      return { campaigns: [], error: null }
    }

    organizationLegacyProfileId =
      resolvedOrganization.organizationLegacyProfileId

    organizationByLegacyProfileId.set(
      resolvedOrganization.organizationLegacyProfileId,
      {
        id: resolvedOrganization.organizationId ?? options.organizationId,
        legacy_profile_id:
          resolvedOrganization.organizationLegacyProfileId,
        name: resolvedOrganization.organizationName ?? '',
        logo_url: resolvedOrganization.imageUrl,
      }
    )
  }

  let eligibleCampaignIds: string[] | null = null

  if ((options.organizationMembershipIds?.length ?? 0) > 0) {
    const { data, error } = await supabase
      .from('campaign_memberships')
      .select('campaign_id')
      .in('organization_membership_id', options.organizationMembershipIds ?? [])
      .eq('status', 'active')

    if (error) {
      return { campaigns: [], error: error.message }
    }

    eligibleCampaignIds = [
      ...new Set(
        ((data ?? []) as CampaignMembershipLookupRow[]).map(
          (membership) => membership.campaign_id
        )
      ),
    ]

    if (eligibleCampaignIds.length === 0) {
      return { campaigns: [], error: null }
    }
  }

  let query = supabase
    .from('campaigns')
    .select(CAMPAIGN_SELECT_COLUMNS)
    .eq('status', 'active')
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)

  if (organizationLegacyProfileId) {
    query = query.eq('organization_id', organizationLegacyProfileId)
  }

  if (options.excludeCampaignId) {
    query = query.neq('id', options.excludeCampaignId)
  }

  if (eligibleCampaignIds) {
    query = query.in('id', eligibleCampaignIds)
  }

  const { data: campaignRows, error: campaignsError } = await query.order(
    'created_at',
    { ascending: true }
  )

  if (campaignsError) {
    return { campaigns: [], error: campaignsError.message }
  }

  const campaigns = (campaignRows ?? []) as CampaignRow[]

  if (campaigns.length === 0) {
    return { campaigns: [], error: null }
  }

  const organizationLegacyProfileIds = [
    ...new Set(campaigns.map((campaign) => campaign.organization_id)),
  ]

  const missingOrganizationLegacyIds = organizationLegacyProfileIds.filter(
    (legacyProfileId) =>
      !organizationByLegacyProfileId.has(legacyProfileId)
  )

  if (missingOrganizationLegacyIds.length > 0) {
    const { data: organizations, error: organizationsError } = await supabase
      .from('organizations')
      .select('id, legacy_profile_id, name, logo_url')
      .in('legacy_profile_id', missingOrganizationLegacyIds)

    if (organizationsError) {
      return { campaigns: [], error: organizationsError.message }
    }

    for (const organization of (organizations ?? []) as OrganizationLookupRow[]) {
      if (organization.legacy_profile_id) {
        organizationByLegacyProfileId.set(
          organization.legacy_profile_id,
          organization
        )
      }
    }
  }

  const campaignIds = campaigns.map((campaign) => campaign.id)
  const { data: purchaseRows, error: purchasesError } = await supabase
    .from('campaign_purchases')
    .select('campaign_id, organization_earnings, payment_status')
    .in('campaign_id', campaignIds)

  if (purchasesError) {
    return { campaigns: [], error: purchasesError.message }
  }

  const amountRaisedByCampaignId = new Map<string, number>()

  for (const purchase of (purchaseRows ?? []) as CampaignPurchaseProgressRow[]) {
    if (!isCampaignPurchaseProgressEligible(purchase.payment_status)) {
      continue
    }

    amountRaisedByCampaignId.set(
      purchase.campaign_id,
      (amountRaisedByCampaignId.get(purchase.campaign_id) ?? 0) +
        Number(purchase.organization_earnings ?? 0)
    )
  }

  return {
    campaigns: campaigns
      .map((campaign) => {
        const organization = organizationByLegacyProfileId.get(
          campaign.organization_id
        )

        return buildSellableCampaignOption({
          campaign,
          organizationId: organization?.id ?? null,
          organizationName: organization?.name ?? null,
          imageUrl: organization?.logo_url ?? null,
          amountRaised: amountRaisedByCampaignId.get(campaign.id) ?? 0,
          now,
        })
      })
      .sort(compareSellableCampaignOptions),
    error: null,
  }
}
