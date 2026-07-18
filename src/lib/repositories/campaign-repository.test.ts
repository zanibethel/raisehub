import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPublicCampaignOrganizationMetadata,
  createSellableCampaignLookupService,
} from './campaign-repository'
import type { CampaignRow } from '../types/identity-access'

function createCampaign(
  overrides: Partial<CampaignRow> = {}
): CampaignRow {
  return {
    id: 'campaign-1',
    organization_id:
      'legacy-organization-1',
    name: 'Fall Fundraiser',
    description: null,
    goal_amount: 5000,
    pass_price: 25,
    starts_at:
      '2026-07-01T00:00:00.000Z',
    ends_at:
      '2026-08-01T00:00:00.000Z',
    status: 'active',
    created_at:
      '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function createService(input?: {
  campaigns?: CampaignRow[]
  progress?: Array<{
    campaign_id: string
    amount_raised: number
  }>
  progressError?: string | null
  effectivePricing?: Record<
    string,
    number
  >
  resolvedOrganization?: {
    organizationId: string
    organizationLegacyProfileId: string
    organizationName: string | null
    imageUrl: string | null
  }
  organizations?: Array<{
    organizationId: string | null
    organizationLegacyProfileId: string
    organizationName: string | null
    imageUrl: string | null
  }>
  onLoadOrganizationsByLegacyProfileIds?: (
    ids: string[]
  ) => void
}) {
  const campaigns =
    input?.campaigns ?? [createCampaign()]

  return createSellableCampaignLookupService({
    resolveOrganizationLegacyProfileId:
      async () => ({
        organizationId:
          input?.resolvedOrganization
            ?.organizationId ??
          'organization-1',
        organizationLegacyProfileId:
          input?.resolvedOrganization
            ?.organizationLegacyProfileId ??
          'legacy-organization-1',
        organizationName:
          input?.resolvedOrganization
            ?.organizationName ??
          'Roosevelt Football',
        imageUrl:
          input?.resolvedOrganization
            ?.imageUrl ?? null,
        error: null,
      }),

    loadEligibleCampaignIds:
      async () => ({
        campaignIds: [],
        error: null,
      }),

    loadCampaignRows: async () => ({
      campaigns,
      error: null,
    }),

    loadOrganizationsByLegacyProfileIds:
      async (ids) => {
        input
          ?.onLoadOrganizationsByLegacyProfileIds?.(
            ids
          )

        return {
          organizations:
            input?.organizations ?? [
              {
                organizationId: null,
                organizationLegacyProfileId:
                  'legacy-organization-1',
                organizationName:
                  'Roosevelt Football',
                imageUrl: null,
              },
              {
                organizationId: null,
                organizationLegacyProfileId:
                  'legacy-organization-2',
                organizationName:
                  'Lincoln PTO',
                imageUrl: null,
              },
            ],
          error: null,
        }
      },

    loadPublicCampaignProgress:
      async () => ({
        amountRaisedByCampaignId:
          new Map(
            (
              input?.progress ?? []
            ).map((aggregate) => [
              aggregate.campaign_id,
              aggregate.amount_raised,
            ])
          ),
        error:
          input?.progressError ?? null,
      }),

    loadEffectiveCampaignPricing:
      async (pricingInputs) =>
        new Map(
          pricingInputs.map(
            ({ campaignId }) => {
              const effectivePassPrice =
                input?.effectivePricing?.[
                  campaignId
                ] ?? 20

              return [
                campaignId,
                effectivePassPrice,
              ]
            }
          )
        ),
  })
}

test(
  'aggregate campaign progress is mapped to the matching campaign card',
  async () => {
    const service = createService({
      campaigns: [
        createCampaign(),
        createCampaign({
          id: 'campaign-2',
          organization_id:
            'legacy-organization-2',
          name: 'Band Boosters',
          created_at:
            '2026-07-02T00:00:00.000Z',
        }),
      ],
      progress: [
        {
          campaign_id: 'campaign-1',
          amount_raised: 1200,
        },
        {
          campaign_id: 'campaign-2',
          amount_raised: 375,
        },
      ],
    })

    const result =
      await service.getSellableCampaigns()

    const amountRaisedByCampaignId =
      new Map(
        result.campaigns.map(
          (campaign) => [
            campaign.id,
            campaign.amountRaised,
          ]
        )
      )

    assert.equal(result.error, null)
    assert.equal(
      result.errorSource,
      null
    )
    assert.equal(
      amountRaisedByCampaignId.get(
        'campaign-1'
      ),
      1200
    )
    assert.equal(
      amountRaisedByCampaignId.get(
        'campaign-2'
      ),
      375
    )
  }
)

test(
  'missing aggregate rows safely default campaign cards to zero raised',
  async () => {
    const service = createService({
      campaigns: [
        createCampaign(),
        createCampaign({
          id: 'campaign-2',
          organization_id:
            'legacy-organization-2',
          name: 'Band Boosters',
          created_at:
            '2026-07-02T00:00:00.000Z',
        }),
      ],
      progress: [
        {
          campaign_id: 'campaign-1',
          amount_raised: 900,
        },
      ],
    })

    const result =
      await service.getSellableCampaigns()

    const secondCampaign =
      result.campaigns.find(
        (campaign) =>
          campaign.id === 'campaign-2'
      )

    assert.equal(result.error, null)
    assert.equal(
      secondCampaign?.amountRaised,
      0
    )
  }
)

test(
  'aggregate progress RPC failures remain distinguishable from an empty campaign state',
  async () => {
    const service = createService({
      campaigns: [createCampaign()],
      progressError:
        'public-campaign-progress-unavailable',
    })

    const result =
      await service.getSellableCampaigns()

    assert.deepEqual(result, {
      campaigns: [],
      error:
        'public-campaign-progress-unavailable',
      errorSource: 'progress',
    })
  }
)

test(
  'public campaign cards receive organization names from legacy profiles',
  async () => {
    const service = createService({
      organizations: [
        {
          organizationId: null,
          organizationLegacyProfileId:
            'legacy-organization-1',
          organizationName:
            'Roosevelt Football Booster Club',
          imageUrl:
            'https://cdn.example.com/org-1.png',
        },
      ],
    })

    const result =
      await service.getSellableCampaigns()

    assert.equal(
      result.campaigns[0]
        ?.organizationName,
      'Roosevelt Football Booster Club'
    )

    assert.equal(
      result.campaigns[0]?.imageUrl,
      'https://cdn.example.com/org-1.png'
    )
  }
)

test(
  'display_name is preferred over business_name for public legacy profile metadata',
  () => {
    const metadata =
      buildPublicCampaignOrganizationMetadata(
        {
          id: 'legacy-organization-1',
          display_name:
            'Roosevelt Football Booster Club',
          business_name:
            'Roosevelt Football',
          logo_url:
            'https://cdn.example.com/org-1.png',
        }
      )

    assert.deepEqual(metadata, {
      organizationId: null,
      organizationLegacyProfileId:
        'legacy-organization-1',
      organizationName:
        'Roosevelt Football Booster Club',
      imageUrl:
        'https://cdn.example.com/org-1.png',
    })
  }
)

test(
  'business_name is used when display_name is missing for public legacy profile metadata',
  () => {
    const metadata =
      buildPublicCampaignOrganizationMetadata(
        {
          id: 'legacy-organization-1',
          display_name: null,
          business_name:
            'Roosevelt Football',
          logo_url: null,
        }
      )

    assert.deepEqual(metadata, {
      organizationId: null,
      organizationLegacyProfileId:
        'legacy-organization-1',
      organizationName:
        'Roosevelt Football',
      imageUrl: null,
    })
  }
)

test(
  'missing public legacy profile metadata keeps the current safe campaign card fallback values',
  async () => {
    const service = createService({
      organizations: [],
    })

    const result =
      await service.getSellableCampaigns()

    assert.equal(
      result.campaigns[0]
        ?.organizationName,
      null
    )

    assert.equal(
      result.campaigns[0]?.imageUrl,
      null
    )
  }
)

test(
  'authenticated organization lookup keeps the new organization id while matching campaigns by legacy profile id',
  async () => {
    const service = createService({
      resolvedOrganization: {
        organizationId:
          'organization-42',
        organizationLegacyProfileId:
          'legacy-organization-1',
        organizationName:
          'Roosevelt Football Workspace',
        imageUrl:
          'https://cdn.example.com/workspace-logo.png',
      },

      onLoadOrganizationsByLegacyProfileIds(
        ids
      ) {
        assert.deepEqual(ids, [])
      },
    })

    const result =
      await service.getSellableCampaigns(
        {
          organizationId:
            'organization-42',
        }
      )

    assert.equal(
      result.campaigns[0]
        ?.organizationId,
      'organization-42'
    )

    assert.equal(
      result.campaigns[0]
        ?.organizationLegacyProfileId,
      'legacy-organization-1'
    )

    assert.equal(
      result.campaigns[0]
        ?.organizationName,
      'Roosevelt Football Workspace'
    )

    assert.equal(
      result.campaigns[0]?.imageUrl,
      'https://cdn.example.com/workspace-logo.png'
    )
  }
)

test(
  'public campaign card enrichment only compares legacy profile ids for metadata lookups',
  async () => {
    let requestedLegacyIds:
      string[] = []

    const service = createService({
      campaigns: [
        createCampaign({
          organization_id:
            'legacy-organization-9',
        }),
      ],

      onLoadOrganizationsByLegacyProfileIds(
        ids
      ) {
        requestedLegacyIds = ids
      },

      organizations: [
        {
          organizationId: null,
          organizationLegacyProfileId:
            'legacy-organization-9',
          organizationName:
            'Legacy Lookup Match',
          imageUrl: null,
        },
      ],
    })

    const result =
      await service.getSellableCampaigns(
        {
          organizationId:
            'organization-9',
        }
      )

    assert.deepEqual(
      requestedLegacyIds,
      ['legacy-organization-9']
    )

    assert.equal(
      result.campaigns[0]
        ?.organizationName,
      'Legacy Lookup Match'
    )
  }
)

test(
  'general campaign lookup tests use explicit managed pricing',
  async () => {
    const service = createService({
      campaigns: [
        createCampaign(),
      ],
      effectivePricing: {
        'campaign-1': 27,
      },
    })

    const result =
      await service.getSellableCampaigns()

    assert.equal(
      result.campaigns[0]?.passPrice,
      27
    )
  }
)