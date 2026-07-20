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

export type PricingRuleRow = {
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

export type NormalizedPricingInput = {
  campaignId: string | null
  organizationId: string | null
  townName: string | null
  stateCode: string | null
}

export type DemoSeparatedPricingInputs<
  T extends { isDemo?: boolean }
> = {
  productionInputs: T[]
  demoInputs: T[]
}

export function separatePricingInputsByDemo<
  T extends { isDemo?: boolean }
>(
  inputs: T[]
): DemoSeparatedPricingInputs<T> {
  return {
    productionInputs: inputs.filter(
      (input) => !input.isDemo
    ),
    demoInputs: inputs.filter(
      (input) => input.isDemo === true
    ),
  }
}

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

export function normalizeMoney(
  value: number | undefined
) {
  const normalized = Number(value ?? 0)

  if (!Number.isFinite(normalized)) {
    return 0
  }

  return Math.max(0, normalized)
}

export function normalizeStateCode(
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

export function normalizeTownName(
  value: string | null | undefined
) {
  const normalized =
    value?.trim().toLowerCase() ?? null

  return normalized || null
}

export function normalizePricingInput(
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

export function calculatePricing(
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

export function matchesPricingRule(
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

export function comparePricingRules(
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

export function createFallbackPricing(
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

export function resolvePricingFromRules({
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
      matchesPricingRule(rule, input)
    )
    .sort(comparePricingRules)[0]

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