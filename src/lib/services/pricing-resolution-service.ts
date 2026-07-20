import 'server-only'

import {
  createFallbackPricing,
  normalizeMoney,
  normalizePricingInput,
  resolvePricingFromRules,
  type EffectivePricingInput,
  type EffectivePricingResult,
  type PricingRuleRow,
  type PricingScope,
} from '@/lib/services/pricing-resolution-core'
import { enrichPricingInputsWithOrganizationLocations } from '@/lib/services/organization-pricing-location-service'
import { createAdminClient } from '@/lib/supabase/admin'

export type {
  EffectivePricingInput,
  EffectivePricingResult,
  PricingScope,
} from '@/lib/services/pricing-resolution-core'

export type EffectiveCampaignPricingInput = {
  campaignId: string
  organizationId?: string | null
  townName?: string | null
  stateCode?: string | null
  donationAmount?: number
  isDemo?: boolean
}

export type EffectiveCampaignPricingBatchResult = {
  pricingByCampaignId: Map<
    string,
    EffectivePricingResult
  >
  usedFallback: boolean
}

const PRICING_RULE_SELECT = `
  id,
  scope_type,
  state_code,
  town_name,
  organization_id,
  campaign_id,
  pass_price,
  platform_fee_percent,
  starts_at,
  expires_at,
  reason,
  created_at
`

async function loadActivePricingRules({
  isDemo,
  now,
}: {
  isDemo: boolean
  now: Date
}): Promise<PricingRuleRow[] | null> {
  const admin = createAdminClient()
  const nowIso = now.toISOString()

  const { data, error } = await admin
    .from('pricing_rules')
    .select(PRICING_RULE_SELECT)
    .eq('status', 'active')
    .eq('is_demo', isDemo)
    .lte('starts_at', nowIso)
    .or(
      `expires_at.is.null,expires_at.gt.${nowIso}`
    )

  if (error) {
    return null
  }

  return (data ?? []) as PricingRuleRow[]
}

export async function resolveEffectivePricing(
  input: EffectivePricingInput = {}
): Promise<EffectivePricingResult> {
  const now = input.now ?? new Date()

  const donationAmount = normalizeMoney(
    input.donationAmount
  )

  try {
    const [locatedInput] =
      await enrichPricingInputsWithOrganizationLocations([
        input,
      ])

    const rules =
      await loadActivePricingRules({
        isDemo: locatedInput.isDemo ?? false,
        now,
      })

    if (!rules) {
      return createFallbackPricing(
        donationAmount
      )
    }

    return resolvePricingFromRules({
      rules,
      input: normalizePricingInput(locatedInput),
      donationAmount,
    })
  } catch {
    return createFallbackPricing(
      donationAmount
    )
  }
}

export async function resolveEffectiveCampaignPricingBatch(
  inputs: EffectiveCampaignPricingInput[],
  options: {
    now?: Date
  } = {}
): Promise<EffectiveCampaignPricingBatchResult> {
  const pricingByCampaignId = new Map<
    string,
    EffectivePricingResult
  >()

  if (inputs.length === 0) {
    return {
      pricingByCampaignId,
      usedFallback: false,
    }
  }

  const now = options.now ?? new Date()

  const uniqueInputs = [
    ...new Map(
      inputs
        .filter((input) =>
          Boolean(input.campaignId.trim())
        )
        .map((input) => [
          input.campaignId.trim(),
          {
            ...input,
            campaignId:
              input.campaignId.trim(),
          },
        ])
    ).values(),
  ]

  const locatedInputs =
    await enrichPricingInputsWithOrganizationLocations(
      uniqueInputs
    )

  const productionInputs =
    locatedInputs.filter(
      (input) => !input.isDemo
    )

  const demoInputs = locatedInputs.filter(
    (input) => input.isDemo
  )

  let usedFallback = false

  async function resolveGroup({
    group,
    isDemo,
  }: {
    group: EffectiveCampaignPricingInput[]
    isDemo: boolean
  }) {
    if (group.length === 0) {
      return
    }

    let rules: PricingRuleRow[] | null = null

    try {
      rules = await loadActivePricingRules({
        isDemo,
        now,
      })
    } catch {
      rules = null
    }

    for (const input of group) {
      const donationAmount =
        normalizeMoney(
          input.donationAmount
        )

      const pricing = rules
        ? resolvePricingFromRules({
            rules,
            input: normalizePricingInput(
              input
            ),
            donationAmount,
          })
        : createFallbackPricing(
            donationAmount
          )

      if (pricing.usedFallback) {
        usedFallback = true
      }

      pricingByCampaignId.set(
        input.campaignId,
        pricing
      )
    }
  }

  await Promise.all([
    resolveGroup({
      group: productionInputs,
      isDemo: false,
    }),
    resolveGroup({
      group: demoInputs,
      isDemo: true,
    }),
  ])

  return {
    pricingByCampaignId,
    usedFallback,
  }
}