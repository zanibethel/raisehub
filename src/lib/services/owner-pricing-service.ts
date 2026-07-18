import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export type OwnerPricingEnvironment = 'production' | 'demo'

export type OwnerPlatformPricingSummary = {
  environment: OwnerPricingEnvironment
  pricingRuleId: string | null
  passPrice: number
  platformFeePercent: number
  platformFeeAmount: number
  organizationPassEarnings: number
  startsAt: string | null
  expiresAt: string | null
  reason: string | null
  usesFallback: boolean
}

export type OwnerPricingRuleCounts = {
  platform: number
  state: number
  town: number
  organization: number
  campaign: number
  total: number
}

export type OwnerPricingOverview = {
  production: OwnerPlatformPricingSummary
  demo: OwnerPlatformPricingSummary
  productionRuleCounts: OwnerPricingRuleCounts
  demoRuleCounts: OwnerPricingRuleCounts
}

export type OwnerPricingOverviewResult =
  | {
      status: 'success'
      overview: OwnerPricingOverview
    }
  | {
      status: 'unauthenticated'
      message: string
    }
  | {
      status: 'owner-role-required'
      message: string
    }
  | {
      status: 'lookup-failure'
      message: string
    }

type ActorProfile = {
  role: string
}

type PricingRuleRow = {
  id: string
  scope_type: string
  pass_price: number
  platform_fee_percent: number
  status: string
  starts_at: string
  expires_at: string | null
  reason: string | null
  is_demo: boolean
  created_at: string
}

// =============================================================================
// Constants
// =============================================================================

const FALLBACK_PASS_PRICE = 20
const FALLBACK_PLATFORM_FEE_PERCENT = 20

const EMPTY_RULE_COUNTS: OwnerPricingRuleCounts = {
  platform: 0,
  state: 0,
  town: 0,
  organization: 0,
  campaign: 0,
  total: 0,
}

// =============================================================================
// Helpers
// =============================================================================

function normalizeMoney(value: number) {
  const normalized = Number(value)

  if (!Number.isFinite(normalized)) {
    return 0
  }

  return Math.round(normalized * 100) / 100
}

function calculateSummary(input: {
  environment: OwnerPricingEnvironment
  rule: PricingRuleRow | null
}): OwnerPlatformPricingSummary {
  const passPrice = normalizeMoney(
    input.rule?.pass_price ??
      FALLBACK_PASS_PRICE
  )

  const platformFeePercent = normalizeMoney(
    input.rule?.platform_fee_percent ??
      FALLBACK_PLATFORM_FEE_PERCENT
  )

  const platformFeeAmount = normalizeMoney(
    passPrice * (platformFeePercent / 100)
  )

  return {
    environment: input.environment,
    pricingRuleId: input.rule?.id ?? null,
    passPrice,
    platformFeePercent,
    platformFeeAmount,
    organizationPassEarnings: normalizeMoney(
      passPrice - platformFeeAmount
    ),
    startsAt: input.rule?.starts_at ?? null,
    expiresAt: input.rule?.expires_at ?? null,
    reason: input.rule?.reason ?? null,
    usesFallback: !input.rule,
  }
}

function countRules(
  rules: PricingRuleRow[],
  isDemo: boolean
): OwnerPricingRuleCounts {
  const counts = {
    ...EMPTY_RULE_COUNTS,
  }

  for (const rule of rules) {
    if (rule.is_demo !== isDemo) {
      continue
    }

    switch (rule.scope_type) {
      case 'platform':
        counts.platform += 1
        break

      case 'state':
        counts.state += 1
        break

      case 'town':
        counts.town += 1
        break

      case 'organization':
        counts.organization += 1
        break

      case 'campaign':
        counts.campaign += 1
        break
    }

    counts.total += 1
  }

  return counts
}

function compareCurrentPlatformRules(
  left: PricingRuleRow,
  right: PricingRuleRow
) {
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

function findCurrentPlatformRule(
  rules: PricingRuleRow[],
  isDemo: boolean
) {
  return (
    rules
      .filter(
        (rule) =>
          rule.scope_type === 'platform' &&
          rule.is_demo === isDemo
      )
      .sort(compareCurrentPlatformRules)[0] ?? null
  )
}

// =============================================================================
// Service
// =============================================================================

export async function getOwnerPricingOverview(): Promise<OwnerPricingOverviewResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: 'unauthenticated',
      message: 'Sign in to view platform pricing.',
    }
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<ActorProfile>()

  if (profileError || !profile) {
    return {
      status: 'lookup-failure',
      message: 'Unable to verify owner access.',
    }
  }

  if (profile.role !== 'owner') {
    return {
      status: 'owner-role-required',
      message: 'Owner access is required.',
    }
  }

  const nowIso = new Date().toISOString()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('pricing_rules')
    .select(
      `
        id,
        scope_type,
        pass_price,
        platform_fee_percent,
        status,
        starts_at,
        expires_at,
        reason,
        is_demo,
        created_at
      `
    )
    .eq('status', 'active')
    .lte('starts_at', nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

  if (error) {
    return {
      status: 'lookup-failure',
      message: 'Unable to load active pricing rules.',
    }
  }

  const activeRules = (data ?? []) as PricingRuleRow[]

  const productionRule = findCurrentPlatformRule(
    activeRules,
    false
  )

  const demoRule = findCurrentPlatformRule(
    activeRules,
    true
  )

  return {
    status: 'success',
    overview: {
      production: calculateSummary({
        environment: 'production',
        rule: productionRule,
      }),
      demo: calculateSummary({
        environment: 'demo',
        rule: demoRule,
      }),
      productionRuleCounts: countRules(
        activeRules,
        false
      ),
      demoRuleCounts: countRules(activeRules, true),
    },
  }
}
