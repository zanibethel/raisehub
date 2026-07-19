import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type OwnerStatePricingOverride = {
  passPrice: number
  platformFeePercent: number
  startsAt: string
  expiresAt: string | null
  reason: string | null
}

export type OwnerStatePricingEnvironment = {
  activeOverride: OwnerStatePricingOverride | null
  scheduledOverride: OwnerStatePricingOverride | null
}

export type OwnerStatePricingOption = {
  stateCode: string
  production: OwnerStatePricingEnvironment
  demo: OwnerStatePricingEnvironment
}

export type OwnerStatePricingOptionsResult =
  | {
      status: 'success'
      states: OwnerStatePricingOption[]
    }
  | {
      status:
        | 'unauthenticated'
        | 'owner-role-required'
        | 'error'
      message: string
    }

type StatePricingRuleRow = {
  state_code: string | null
  is_demo: boolean
  pass_price: number
  platform_fee_percent: number
  starts_at: string
  expires_at: string | null
  reason: string | null
}

type StateEnvironmentKey =
  `${string}:${'production' | 'demo'}`

function normalizeStateCode(
  value: string | null
): string | null {
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

function getEnvironmentKey(
  stateCode: string,
  isDemo: boolean
): StateEnvironmentKey {
  return `${stateCode}:${
    isDemo ? 'demo' : 'production'
  }`
}

function mapOverride(
  rule: StatePricingRuleRow
): OwnerStatePricingOverride {
  return {
    passPrice: Number(rule.pass_price),
    platformFeePercent: Number(
      rule.platform_fee_percent
    ),
    startsAt: rule.starts_at,
    expiresAt: rule.expires_at,
    reason: rule.reason,
  }
}

export async function getOwnerStatePricingOptions(): Promise<OwnerStatePricingOptionsResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: 'unauthenticated',
      message:
        'Sign in before viewing state pricing options.',
    }
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (profileError || !profile) {
    return {
      status: 'error',
      message:
        'Unable to verify owner access for state pricing.',
    }
  }

  if (profile.role !== 'owner') {
    return {
      status: 'owner-role-required',
      message:
        'Owner access is required to manage state pricing.',
    }
  }

  const admin = createAdminClient()

  const {
    data: ruleData,
    error: ruleError,
  } = await admin
    .from('pricing_rules')
    .select(
      `
        state_code,
        is_demo,
        pass_price,
        platform_fee_percent,
        starts_at,
        expires_at,
        reason
      `
    )
    .eq('scope_type', 'state')
    .eq('status', 'active')
    .order('state_code', {
      ascending: true,
    })
    .order('starts_at', {
      ascending: true,
    })
    .returns<StatePricingRuleRow[]>()

  if (ruleError) {
    return {
      status: 'error',
      message:
        'State pricing options could not be loaded.',
    }
  }

  const now = new Date()

  const currentRuleByKey = new Map<
    StateEnvironmentKey,
    StatePricingRuleRow
  >()

  const scheduledRuleByKey = new Map<
    StateEnvironmentKey,
    StatePricingRuleRow
  >()

  const stateCodes = new Set<string>()

  for (const rule of ruleData ?? []) {
    const stateCode = normalizeStateCode(
      rule.state_code
    )

    if (!stateCode) {
      continue
    }

    stateCodes.add(stateCode)

    const environmentKey =
      getEnvironmentKey(
        stateCode,
        rule.is_demo
      )

    const startsAt = new Date(rule.starts_at)

    const expiresAt = rule.expires_at
      ? new Date(rule.expires_at)
      : null

    const isCurrentlyEffective =
      startsAt <= now &&
      (!expiresAt || expiresAt > now)

    if (isCurrentlyEffective) {
      const existingCurrent =
        currentRuleByKey.get(environmentKey)

      if (
        !existingCurrent ||
        new Date(
          existingCurrent.starts_at
        ) < startsAt
      ) {
        currentRuleByKey.set(
          environmentKey,
          rule
        )
      }

      continue
    }

    if (startsAt <= now) {
      continue
    }

    const existingScheduled =
      scheduledRuleByKey.get(
        environmentKey
      )

    if (
      !existingScheduled ||
      new Date(
        existingScheduled.starts_at
      ) > startsAt
    ) {
      scheduledRuleByKey.set(
        environmentKey,
        rule
      )
    }
  }

  const states = [...stateCodes]
    .sort((left, right) =>
      left.localeCompare(right)
    )
    .map((stateCode) => {
      const productionKey =
        getEnvironmentKey(
          stateCode,
          false
        )

      const demoKey =
        getEnvironmentKey(
          stateCode,
          true
        )

      const productionCurrent =
        currentRuleByKey.get(
          productionKey
        ) ?? null

      const productionScheduled =
        scheduledRuleByKey.get(
          productionKey
        ) ?? null

      const demoCurrent =
        currentRuleByKey.get(
          demoKey
        ) ?? null

      const demoScheduled =
        scheduledRuleByKey.get(
          demoKey
        ) ?? null

      return {
        stateCode,
        production: {
          activeOverride:
            productionCurrent
              ? mapOverride(
                  productionCurrent
                )
              : null,
          scheduledOverride:
            productionScheduled
              ? mapOverride(
                  productionScheduled
                )
              : null,
        },
        demo: {
          activeOverride:
            demoCurrent
              ? mapOverride(demoCurrent)
              : null,
          scheduledOverride:
            demoScheduled
              ? mapOverride(
                  demoScheduled
                )
              : null,
        },
      }
    })

  return {
    status: 'success',
    states,
  }
}