import { createClient } from '../supabase/server'
import {
  buildSellableCampaignOption,
  compareSellableCampaignOptions,
} from '../rules/campaign-progress-rules'
import { resolveEffectiveCampaignPricingBatch } from '../services/pricing-resolution-service'
import type { Database } from '../supabase/database.types'
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
  starts_at,
  ends_at,
  status,
  created_at
`

type CampaignResult = {
  campaign: CampaignRow | null
  error: string | null
}

export type SellableCampaignsErrorSource =
  | 'campaigns'
  | 'progress'

export type SellableCampaignsResult = {
  campaigns: SellableCampaignOption[]
  error: string | null
  errorSource:
    | SellableCampaignsErrorSource
    | null
}

type OrganizationLookupRow = {
  id: string
  legacy_profile_id: string | null
  name: string
  logo_url: string | null
}

type PublicOrganizationProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  | 'id'
  | 'display_name'
  | 'business_name'
  | 'logo_url'
>

export type PublicCampaignOrganizationMetadata = {
  organizationId: string | null
  organizationLegacyProfileId: string
  organizationName: string | null
  imageUrl: string | null
}

export type CampaignRecoveryContextRow =
  Database['public']['Functions']['get_campaign_recovery_context']['Returns'][number]

type PublicCampaignProgressRow =
  Database['public']['Functions']['get_public_campaign_progress']['Returns'][number]

type CampaignMembershipLookupRow = {
  campaign_id: string
}

type EffectiveCampaignPricingLookupInput = {
  campaignId: string
  organizationId: string | null
}

const PUBLIC_CAMPAIGN_PROGRESS_UNAVAILABLE =
  'public-campaign-progress-unavailable'

function normalizePublicOrganizationName(
  profile: Pick<
    Database['public']['Tables']['profiles']['Row'],
    'display_name' | 'business_name'
  >
) {
  return (
    profile.display_name ||
    profile.business_name ||
    null
  )
}

export function buildPublicCampaignOrganizationMetadata(
  profile: PublicOrganizationProfileRow
): PublicCampaignOrganizationMetadata {
  return {
    organizationId: null,
    organizationLegacyProfileId: profile.id,
    organizationName:
      normalizePublicOrganizationName(profile),
    imageUrl: profile.logo_url,
  }
}

function mergeCanonicalOrganizationMetadata({
  profiles,
  organizations,
}: {
  profiles: PublicOrganizationProfileRow[]
  organizations: OrganizationLookupRow[]
}): PublicCampaignOrganizationMetadata[] {
  const metadataByLegacyProfileId =
    new Map<
      string,
      PublicCampaignOrganizationMetadata
    >(
      profiles.map((profile) => {
        const metadata =
          buildPublicCampaignOrganizationMetadata(
            profile
          )

        return [
          metadata.organizationLegacyProfileId,
          metadata,
        ]
      })
    )

  for (const organization of organizations) {
    const legacyProfileId =
      organization.legacy_profile_id

    if (!legacyProfileId) {
      continue
    }

    const existingMetadata =
      metadataByLegacyProfileId.get(
        legacyProfileId
      )

    metadataByLegacyProfileId.set(
      legacyProfileId,
      {
        organizationId:
          organization.id,
        organizationLegacyProfileId:
          legacyProfileId,
        organizationName:
          existingMetadata
            ?.organizationName ??
          organization.name ??
          null,
        imageUrl:
          existingMetadata?.imageUrl ??
          organization.logo_url ??
          null,
      }
    )
  }

  return [
    ...metadataByLegacyProfileId.values(),
  ]
}

function mapPublicCampaignProgressRows(
  progress: PublicCampaignProgressRow[]
) {
  const amountRaisedByCampaignId =
    new Map<string, number>()

  for (const aggregate of progress) {
    amountRaisedByCampaignId.set(
      aggregate.campaign_id,
      Number(aggregate.amount_raised ?? 0)
    )
  }

  return amountRaisedByCampaignId
}

async function loadPublicCampaignProgressWithClient(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  campaignIds: string[]
): Promise<{
  amountRaisedByCampaignId: Map<
    string,
    number
  >
  error: string | null
}> {
  const { data, error } = await supabase.rpc(
    'get_public_campaign_progress',
    {
      p_campaign_ids: campaignIds,
    }
  )

  if (error) {
    return {
      amountRaisedByCampaignId: new Map(),
      error:
        PUBLIC_CAMPAIGN_PROGRESS_UNAVAILABLE,
    }
  }

  return {
    amountRaisedByCampaignId:
      mapPublicCampaignProgressRows(
        (data ??
          []) as PublicCampaignProgressRow[]
      ),
    error: null,
  }
}

export async function getPublicCampaignProgress(
  campaignIds: string[]
): Promise<{
  amountRaisedByCampaignId: Map<
    string,
    number
  >
  error: string | null
}> {
  const supabase = await createClient()

  return loadPublicCampaignProgressWithClient(
    supabase,
    campaignIds
  )
}

async function resolveOrganizationLegacyProfileId(
  organizationId: string
): Promise<{
  organizationId: string | null
  organizationLegacyProfileId:
    | string
    | null
  organizationName: string | null
  imageUrl: string | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, legacy_profile_id, name, logo_url'
    )
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
    organizationLegacyProfileId:
      data?.legacy_profile_id ?? null,
    organizationName: data?.name ?? null,
    imageUrl: data?.logo_url ?? null,
    error: null,
  }
}

type SellableCampaignLookupDependencies = {
  resolveOrganizationLegacyProfileId(
    organizationId: string
  ): ReturnType<
    typeof resolveOrganizationLegacyProfileId
  >

  loadEligibleCampaignIds(
    organizationMembershipIds: string[]
  ): Promise<{
    campaignIds: string[]
    error: string | null
  }>

  loadCampaignRows(input: {
    nowIso: string
    organizationLegacyProfileId:
      | string
      | null
    excludeCampaignId?: string
    eligibleCampaignIds: string[] | null
  }): Promise<{
    campaigns: CampaignRow[]
    error: string | null
  }>

  loadOrganizationsByLegacyProfileIds(
    organizationLegacyProfileIds: string[]
  ): Promise<{
    organizations: PublicCampaignOrganizationMetadata[]
    error: string | null
  }>

  loadPublicCampaignProgress(
    campaignIds: string[]
  ): Promise<{
    amountRaisedByCampaignId: Map<
      string,
      number
    >
    error: string | null
  }>

  loadEffectiveCampaignPricing(
    inputs: EffectiveCampaignPricingLookupInput[],
    now: Date
  ): Promise<Map<string, number>>
}

export function createSellableCampaignLookupService(
  dependencies: SellableCampaignLookupDependencies
) {
  async function getSellableCampaigns(
    options: SellableCampaignQueryOptions = {}
  ): Promise<SellableCampaignsResult> {
    const now = options.now ?? new Date()
    const nowIso = now.toISOString()

    let organizationLegacyProfileId =
      options.organizationLegacyProfileId ??
      null

    const organizationByLegacyProfileId =
      new Map<
        string,
        PublicCampaignOrganizationMetadata
      >()

    if (
      !organizationLegacyProfileId &&
      options.organizationId
    ) {
      const resolvedOrganization =
        await dependencies.resolveOrganizationLegacyProfileId(
          options.organizationId
        )

      if (resolvedOrganization.error) {
        return {
          campaigns: [],
          error:
            resolvedOrganization.error,
          errorSource: 'campaigns',
        }
      }

      if (
        !resolvedOrganization.organizationLegacyProfileId
      ) {
        return {
          campaigns: [],
          error: null,
          errorSource: null,
        }
      }

      organizationLegacyProfileId =
        resolvedOrganization.organizationLegacyProfileId

      organizationByLegacyProfileId.set(
        resolvedOrganization.organizationLegacyProfileId,
        {
          organizationId:
            resolvedOrganization.organizationId ??
            options.organizationId,
          organizationLegacyProfileId:
            resolvedOrganization.organizationLegacyProfileId,
          organizationName:
            resolvedOrganization.organizationName ??
            null,
          imageUrl:
            resolvedOrganization.imageUrl,
        }
      )
    }

    let eligibleCampaignIds:
      | string[]
      | null = null

    if (
      (options.organizationMembershipIds
        ?.length ?? 0) > 0
    ) {
      const { campaignIds, error } =
        await dependencies.loadEligibleCampaignIds(
          options.organizationMembershipIds ??
            []
        )

      if (error) {
        return {
          campaigns: [],
          error,
          errorSource: 'campaigns',
        }
      }

      eligibleCampaignIds = campaignIds

      if (
        eligibleCampaignIds.length === 0
      ) {
        return {
          campaigns: [],
          error: null,
          errorSource: null,
        }
      }
    }

    const {
      campaigns,
      error: campaignsError,
    } =
      await dependencies.loadCampaignRows({
        nowIso,
        organizationLegacyProfileId,
        excludeCampaignId:
          options.excludeCampaignId,
        eligibleCampaignIds,
      })

    if (campaignsError) {
      return {
        campaigns: [],
        error: campaignsError,
        errorSource: 'campaigns',
      }
    }

    if (campaigns.length === 0) {
      return {
        campaigns: [],
        error: null,
        errorSource: null,
      }
    }

    const organizationLegacyProfileIds =
      [
        ...new Set(
          campaigns.map(
            (campaign) =>
              campaign.organization_id
          )
        ),
      ]

    const missingOrganizationLegacyIds =
      organizationLegacyProfileIds.filter(
        (legacyProfileId) =>
          !organizationByLegacyProfileId.has(
            legacyProfileId
          )
      )

    if (
      missingOrganizationLegacyIds.length >
      0
    ) {
      const {
        organizations,
        error: organizationsError,
      } =
        await dependencies.loadOrganizationsByLegacyProfileIds(
          missingOrganizationLegacyIds
        )

      if (organizationsError) {
        return {
          campaigns: [],
          error: organizationsError,
          errorSource: 'campaigns',
        }
      }

      for (const organization of organizations) {
        organizationByLegacyProfileId.set(
          organization.organizationLegacyProfileId,
          organization
        )
      }
    }

    const campaignIds = campaigns.map(
      (campaign) => campaign.id
    )

    const {
      amountRaisedByCampaignId,
      error: progressError,
    } =
      await dependencies.loadPublicCampaignProgress(
        campaignIds
      )

    if (progressError) {
      return {
        campaigns: [],
        error: progressError,
        errorSource: 'progress',
      }
    }

    const effectivePassPriceByCampaignId =
      await dependencies.loadEffectiveCampaignPricing(
        campaigns.map((campaign) => {
          const organization =
            organizationByLegacyProfileId.get(
              campaign.organization_id
            )

          return {
            campaignId: campaign.id,
            organizationId:
              organization?.organizationId ??
              null,
          }
        }),
        now
      )

    return {
      campaigns: campaigns
        .map((campaign) => {
          const organization =
            organizationByLegacyProfileId.get(
              campaign.organization_id
            )

          return buildSellableCampaignOption({
            campaign,
            organizationId:
              organization?.organizationId ??
              null,
            organizationName:
              organization?.organizationName ??
              null,
            imageUrl:
              organization?.imageUrl ?? null,
            amountRaised:
              amountRaisedByCampaignId.get(
                campaign.id
              ) ?? 0,
            effectivePassPrice:
              effectivePassPriceByCampaignId.get(
                campaign.id
              ),
            now,
          })
        })
        .sort(
          compareSellableCampaignOptions
        ),
      error: null,
      errorSource: null,
    }
  }

  return {
    getSellableCampaigns,
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
    return {
      campaign: null,
      error: error.message,
    }
  }

  return {
    campaign: data,
    error: null,
  }
}

export async function getCampaignRecoveryContext(
  campaignId: string
): Promise<{
  context:
    | CampaignRecoveryContextRow
    | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } =
    await supabase.rpc(
      'get_campaign_recovery_context',
      {
        p_campaign_id: campaignId,
      }
    )

  if (error) {
    return {
      context: null,
      error: error.message,
    }
  }

  return {
    context: (data ?? [])[0] ?? null,
    error: null,
  }
}

export async function getSellableCampaigns(
  options: SellableCampaignQueryOptions = {}
): Promise<SellableCampaignsResult> {
  const supabase = await createClient()

  const service =
    createSellableCampaignLookupService({
      resolveOrganizationLegacyProfileId,

      async loadEligibleCampaignIds(
        organizationMembershipIds
      ) {
        const { data, error } =
          await supabase
            .from(
              'campaign_memberships'
            )
            .select('campaign_id')
            .in(
              'organization_membership_id',
              organizationMembershipIds
            )
            .eq('status', 'active')

        if (error) {
          return {
            campaignIds: [],
            error: error.message,
          }
        }

        return {
          campaignIds: [
            ...new Set(
              (
                (data ??
                  []) as CampaignMembershipLookupRow[]
              ).map(
                (membership) =>
                  membership.campaign_id
              )
            ),
          ],
          error: null,
        }
      },

      async loadCampaignRows(input) {
        let query = supabase
          .from('campaigns')
          .select(
            CAMPAIGN_SELECT_COLUMNS
          )
          .eq('status', 'active')
          .or(
            `starts_at.is.null,starts_at.lte.${input.nowIso}`
          )
          .or(
            `ends_at.is.null,ends_at.gt.${input.nowIso}`
          )

        if (
          input.organizationLegacyProfileId
        ) {
          query = query.eq(
            'organization_id',
            input.organizationLegacyProfileId
          )
        }

        if (input.excludeCampaignId) {
          query = query.neq(
            'id',
            input.excludeCampaignId
          )
        }

        if (
          input.eligibleCampaignIds
        ) {
          query = query.in(
            'id',
            input.eligibleCampaignIds
          )
        }

        const { data, error } =
          await query.order(
            'created_at',
            {
              ascending: true,
            }
          )

        return {
          campaigns:
            ((data ??
              []) as CampaignRow[]) ?? [],
          error:
            error?.message ?? null,
        }
      },

      async loadOrganizationsByLegacyProfileIds(
        organizationLegacyProfileIds
      ) {
        const [
          {
            data: organizationRows,
            error: organizationsError,
          },
          {
            data: profileRows,
            error: profilesError,
          },
        ] = await Promise.all([
          supabase
            .from('organizations')
            .select(
              'id, legacy_profile_id, name, logo_url'
            )
            .in(
              'legacy_profile_id',
              organizationLegacyProfileIds
            ),
          supabase
            .from('profiles')
            .select(
              'id, display_name, business_name, logo_url'
            )
            .in(
              'id',
              organizationLegacyProfileIds
            )
            .eq(
              'role',
              'organization'
            ),
        ])

        const lookupError =
          organizationsError ??
          profilesError

        if (lookupError) {
          return {
            organizations: [],
            error: lookupError.message,
          }
        }

        return {
          organizations:
            mergeCanonicalOrganizationMetadata(
              {
                profiles:
                  (profileRows ??
                    []) as PublicOrganizationProfileRow[],
                organizations:
                  (organizationRows ??
                    []) as OrganizationLookupRow[],
              }
            ),
          error: null,
        }
      },

      async loadPublicCampaignProgress(
        campaignIds
      ) {
        return loadPublicCampaignProgressWithClient(
          supabase,
          campaignIds
        )
      },

      async loadEffectiveCampaignPricing(
        inputs,
        now
      ) {
        const {
          pricingByCampaignId,
        } =
          await resolveEffectiveCampaignPricingBatch(
            inputs.map((input) => ({
              campaignId:
                input.campaignId,
              organizationId:
                input.organizationId,
            })),
            {
              now,
            }
          )

        return new Map(
          [...pricingByCampaignId].map(
            ([
              campaignId,
              pricing,
            ]) => [
              campaignId,
              pricing.passPrice,
            ]
          )
        )
      },
    })

  return service.getSellableCampaigns(
    options
  )
}