import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { enrichPricingInputsWithOrganizationLocations } from '@/lib/services/organization-pricing-location-service'

const FALLBACK_PASS_PRICE = 20
const FALLBACK_PLATFORM_FEE_PERCENT = 20

export type PricingScope =
  | 'platform'
  | 'state'
  | 'town'
  | 'organization'
  | 'campaign'
  | 'fallback'

export type EffectivePricingInput = {
  campaignId?: string | null
  organizationId?: string | null
  townName?: string | null
  stateCode?: string | null
  donationAmount?: number
  isDemo?: boolean
  now?: Date
}

export type EffectivePricingResult = {
  pricingRuleId: string | null
  pricingScope: PricingScope
  passPrice: number
  platformFeePercent: number
  platformFeeAmount: number
  organizationPassEarnings: number
  donationAmount: number
  organizationTotalEarnings: number
  totalAmount: number
  startsAt: string | null
  expiresAt: string | null
  reason: string | null
  usedFallback: boolean
}

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

type PricingRuleRow = {
  id: string
  scope_type: string
  state_code: string | null
  town_name: string | null
  organization_id: string | null
  campaign_id: string | null
  pass_price: number
  platform_fee_percent: number
  starts_at: string
  expires_at: string | null
  reason: string | null
  created_at: string
}

type NormalizedPricingInput = {
  campaignId: string | null
  organizationId: string | null
  townName: string | null
  stateCode: string | null
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

const SCOPE_PRIORITY: Record<
  Exclude<PricingScope, 'fallback'>,
  number
> = {
  campaign: 5,
  organization: 4,
  town: 3,
  state: 2,
  platform: 1,
}

function normalizeMoney(
  value: number | undefined
) {
  const normalized = Number(value ?? 0)

  if (!Number.isFinite(normalized)) {
    return 0
  }

  return Math.max(0, normalized)
}

function normalizeStateCode(
  value: string | null | undefined
) {
  const normalized =
    value?.trim().toUpperCase() ?? null

  if (
    !normalized ||
    !/^[A-Z]{2}$/.test(normalized)
  ) {
    return null
  }

  return normalized
}

function normalizeTownName(
  value: string | null | undefined
) {
  const normalized =
    value?.trim().toLowerCase() ?? null

  return normalized || null
}

function normalizePricingInput(
  input: EffectivePricingInput
): NormalizedPricingInput {
  return {
    campaignId:
      input.campaignId?.trim() || null,
    organizationId:
      input.organizationId?.trim() || null,
    townName: normalizeTownName(input.townName),
    stateCode: normalizeStateCode(
      input.stateCode
    ),
  }
}

function calculatePricing(
  input: {
    pricingRuleId: string | null
    pricingScope: PricingScope
    passPrice: number
    platformFeePercent: number
    startsAt: string | null
    expiresAt: string | null
    reason: string | null
    usedFallback: boolean
  },
  donationAmount: number
): EffectivePricingResult {
  const passPrice = normalizeMoney(
    input.passPrice
  )

  const platformFeePercent = Math.min(
    100,
    normalizeMoney(input.platformFeePercent)
  )

  const platformFeeAmount =
    passPrice * (platformFeePercent / 100)

  const organizationPassEarnings =
    passPrice - platformFeeAmount

  return {
    pricingRuleId: input.pricingRuleId,
    pricingScope: input.pricingScope,
    passPrice,
    platformFeePercent,
    platformFeeAmount,
    organizationPassEarnings,
    donationAmount,
    organizationTotalEarnings:
      organizationPassEarnings +
      donationAmount,
    totalAmount:
      passPrice + donationAmount,
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    reason: input.reason,
    usedFallback: input.usedFallback,
  }
}

function matchesRule(
  rule: PricingRuleRow,
  input: NormalizedPricingInput
) {
  switch (rule.scope_type) {
    case 'campaign':
      return Boolean(
        input.campaignId &&
          rule.campaign_id ===
            input.campaignId
      )

    case 'organization':
      return Boolean(
        input.organizationId &&
          rule.organization_id ===
            input.organizationId
      )

    case 'town':
      return Boolean(
        input.stateCode &&
          input.townName &&
          rule.state_code ===
            input.stateCode &&
          normalizeTownName(
            rule.town_name
          ) === input.townName
      )

    case 'state':
      return Boolean(
        input.stateCode &&
          rule.state_code ===
            input.stateCode
      )

    case 'platform':
      return true

    default:
      return false
  }
}

function compareRules(
  left: PricingRuleRow,
  right: PricingRuleRow
) {
  const leftScope =
    SCOPE_PRIORITY[
      left.scope_type as Exclude<
        PricingScope,
        'fallback'
      >
    ] ?? 0

  const rightScope =
    SCOPE_PRIORITY[
      right.scope_type as Exclude<
        PricingScope,
        'fallback'
      >
    ] ?? 0

  if (leftScope !== rightScope) {
    return rightScope - leftScope
  }

  const startsDifference =
    new Date(right.starts_at).getTime() -
    new Date(left.starts_at).getTime()

  if (startsDifference !== 0) {
    return startsDifference
  }

  return (
    new Date(right.created_at).getTime() -
    new Date(left.created_at).getTime()
  )
}

function createFallbackPricing(
  donationAmount: number
): EffectivePricingResult {
  return calculatePricing(
    {
      pricingRuleId: null,
      pricingScope: 'fallback',
      passPrice: FALLBACK_PASS_PRICE,
      platformFeePercent:
        FALLBACK_PLATFORM_FEE_PERCENT,
      startsAt: null,
      expiresAt: null,
      reason:
        'Emergency application fallback because no pricing rule could be resolved.',
      usedFallback: true,
    },
    donationAmount
  )
}

function resolvePricingFromRules({
  rules,
  input,
  donationAmount,
}: {
  rules: PricingRuleRow[]
  input: NormalizedPricingInput
  donationAmount: number
}): EffectivePricingResult {
  const winningRule = rules
    .filter((rule) =>
      matchesRule(rule, input)
    )
    .sort(compareRules)[0]

  if (!winningRule) {
    return createFallbackPricing(
      donationAmount
    )
  }

  return calculatePricing(
    {
      pricingRuleId: winningRule.id,
      pricingScope:
        winningRule.scope_type as Exclude<
          PricingScope,
          'fallback'
        >,
      passPrice: Number(
        winningRule.pass_price
      ),
      platformFeePercent: Number(
        winningRule.platform_fee_percent
      ),
      startsAt: winningRule.starts_at,
      expiresAt: winningRule.expires_at,
      reason: winningRule.reason,
      usedFallback: false,
    },
    donationAmount
  )
}

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