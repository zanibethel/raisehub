import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type OwnerTownPricingOverride = {
  passPrice: number
  platformFeePercent: number
  startsAt: string
  expiresAt: string | null
  reason: string | null
}

export type OwnerTownPricingEnvironment = {
  activeOverride: OwnerTownPricingOverride | null
  scheduledOverride: OwnerTownPricingOverride | null
}

export type OwnerTownPricingOption = {
  stateCode: string
  townName: string
  production: OwnerTownPricingEnvironment
  demo: OwnerTownPricingEnvironment
}

export type OwnerTownPricingOptionsResult =
  | {
      status: 'success'
      towns: OwnerTownPricingOption[]
    }
  | {
      status:
        | 'unauthenticated'
        | 'owner-role-required'
        | 'error'
      message: string
    }

type TownPricingRuleRow = {
  state_code: string | null
  town_name: string | null
  is_demo: boolean
  pass_price: number
  platform_fee_percent: number
  starts_at: string
  expires_at: string | null
  reason: string | null
}

type TownKey = `${string}:${string}`

type TownEnvironmentKey =
  `${TownKey}:${'production' | 'demo'}`

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

function normalizeTownName(
  value: string | null
): string | null {
  const normalized =
    value?.trim().replace(/\s+/g, ' ') ?? null

  return normalized || null
}

function getTownKey(
  stateCode: string,
  townName: string
): TownKey {
  return `${stateCode}:${townName.toLowerCase()}`
}

function getEnvironmentKey(
  stateCode: string,
  townName: string,
  isDemo: boolean
): TownEnvironmentKey {
  return `${getTownKey(
    stateCode,
    townName
  )}:${isDemo ? 'demo' : 'production'}`
}

function mapOverride(
  rule: TownPricingRuleRow
): OwnerTownPricingOverride {
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

export async function getOwnerTownPricingOptions(): Promise<OwnerTownPricingOptionsResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: 'unauthenticated',
      message:
        'Sign in before viewing town pricing options.',
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
        'Unable to verify owner access for town pricing.',
    }
  }

  if (profile.role !== 'owner') {
    return {
      status: 'owner-role-required',
      message:
        'Owner access is required to manage town pricing.',
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
        town_name,
        is_demo,
        pass_price,
        platform_fee_percent,
        starts_at,
        expires_at,
        reason
      `
    )
    .eq('scope_type', 'town')
    .eq('status', 'active')
    .order('state_code', {
      ascending: true,
    })
    .order('town_name', {
      ascending: true,
    })
    .order('starts_at', {
      ascending: true,
    })
    .returns<TownPricingRuleRow[]>()

  if (ruleError) {
    return {
      status: 'error',
      message:
        'Town pricing options could not be loaded.',
    }
  }

  const now = new Date()

  const currentRuleByKey = new Map<
    TownEnvironmentKey,
    TownPricingRuleRow
  >()

  const scheduledRuleByKey = new Map<
    TownEnvironmentKey,
    TownPricingRuleRow
  >()

  const townByKey = new Map<
    TownKey,
    {
      stateCode: string
      townName: string
    }
  >()

  for (const rule of ruleData ?? []) {
    const stateCode = normalizeStateCode(
      rule.state_code
    )

    const townName = normalizeTownName(
      rule.town_name
    )

    if (!stateCode || !townName) {
      continue
    }

    const townKey = getTownKey(
      stateCode,
      townName
    )

    townByKey.set(townKey, {
      stateCode,
      townName,
    })

    const environmentKey =
      getEnvironmentKey(
        stateCode,
        townName,
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

  const towns = [
    ...townByKey.values(),
  ]
    .sort((left, right) => {
      const stateComparison =
        left.stateCode.localeCompare(
          right.stateCode
        )

      if (stateComparison !== 0) {
        return stateComparison
      }

      return left.townName.localeCompare(
        right.townName
      )
    })
    .map((town) => {
      const productionKey =
        getEnvironmentKey(
          town.stateCode,
          town.townName,
          false
        )

      const demoKey = getEnvironmentKey(
        town.stateCode,
        town.townName,
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
        stateCode: town.stateCode,
        townName: town.townName,
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
          activeOverride: demoCurrent
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
    towns,
  }
}