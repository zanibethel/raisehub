import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type OwnerOrganizationPricingOverride = {
  passPrice: number
  platformFeePercent: number
  startsAt: string
  expiresAt: string | null
  reason: string | null
}

export type OwnerOrganizationPricingEnvironment = {
  activeOverride: OwnerOrganizationPricingOverride | null
  scheduledOverride: OwnerOrganizationPricingOverride | null
}

export type OwnerOrganizationPricingOption = {
  id: string
  name: string
  production: OwnerOrganizationPricingEnvironment
  demo: OwnerOrganizationPricingEnvironment
}

export type OwnerOrganizationPricingOptionsResult =
  | {
      status: 'success'
      organizations: OwnerOrganizationPricingOption[]
    }
  | {
      status:
        | 'unauthenticated'
        | 'owner-role-required'
        | 'error'
      message: string
    }

type OrganizationOptionRow = {
  id: string
  name: string
}

type OrganizationPricingRuleRow = {
  organization_id: string | null
  is_demo: boolean
  pass_price: number
  platform_fee_percent: number
  starts_at: string
  expires_at: string | null
  reason: string | null
}

type OrganizationRuleKey = `${string}:${'production' | 'demo'}`

function getRuleKey(
  organizationId: string,
  isDemo: boolean
): OrganizationRuleKey {
  return `${organizationId}:${
    isDemo ? 'demo' : 'production'
  }`
}

function mapOverride(
  rule: OrganizationPricingRuleRow
): OwnerOrganizationPricingOverride {
  return {
    passPrice: rule.pass_price,
    platformFeePercent:
      rule.platform_fee_percent,
    startsAt: rule.starts_at,
    expiresAt: rule.expires_at,
    reason: rule.reason,
  }
}

export async function getOwnerOrganizationPricingOptions(): Promise<OwnerOrganizationPricingOptionsResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: 'unauthenticated',
      message:
        'Sign in before viewing organization pricing options.',
    }
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

  if (profileError || !profile) {
    return {
      status: 'error',
      message:
        'Unable to verify owner access for organization pricing.',
    }
  }

  if (profile.role !== 'owner') {
    return {
      status: 'owner-role-required',
      message:
        'Owner access is required to manage organization pricing.',
    }
  }

  const admin = createAdminClient()

  const [
    organizationResult,
    activeRuleResult,
  ] = await Promise.all([
    admin
      .from('organizations')
      .select('id, name')
      .order('name', { ascending: true })
      .returns<OrganizationOptionRow[]>(),
    admin
      .from('pricing_rules')
      .select(
        'organization_id, is_demo, pass_price, platform_fee_percent, starts_at, expires_at, reason'
      )
      .eq('scope_type', 'organization')
      .eq('status', 'active')
      .order('starts_at', {
        ascending: true,
      })
      .returns<OrganizationPricingRuleRow[]>(),
  ])

  if (organizationResult.error) {
    return {
      status: 'error',
      message:
        'Organization pricing options could not be loaded.',
    }
  }

  if (activeRuleResult.error) {
    return {
      status: 'error',
      message:
        'Active organization pricing overrides could not be loaded.',
    }
  }

  const now = new Date()

  const currentRuleByKey = new Map<
    OrganizationRuleKey,
    OrganizationPricingRuleRow
  >()

  const scheduledRuleByKey = new Map<
    OrganizationRuleKey,
    OrganizationPricingRuleRow
  >()

  for (const rule of activeRuleResult.data ?? []) {
    if (!rule.organization_id) {
      continue
    }

    const key = getRuleKey(
      rule.organization_id,
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
        currentRuleByKey.get(key)

      if (
        !existingCurrent ||
        new Date(existingCurrent.starts_at) <
          startsAt
      ) {
        currentRuleByKey.set(key, rule)
      }

      continue
    }

    if (startsAt <= now) {
      continue
    }

    const existingScheduled =
      scheduledRuleByKey.get(key)

    if (
      !existingScheduled ||
      new Date(existingScheduled.starts_at) >
        startsAt
    ) {
      scheduledRuleByKey.set(key, rule)
    }
  }

  return {
    status: 'success',
    organizations: (
      organizationResult.data ?? []
    ).map((organization) => {
      const productionKey = getRuleKey(
        organization.id,
        false
      )

      const demoKey = getRuleKey(
        organization.id,
        true
      )

      const productionCurrent =
        currentRuleByKey.get(productionKey) ??
        null

      const productionScheduled =
        scheduledRuleByKey.get(productionKey) ??
        null

      const demoCurrent =
        currentRuleByKey.get(demoKey) ?? null

      const demoScheduled =
        scheduledRuleByKey.get(demoKey) ?? null

      return {
        id: organization.id,
        name: organization.name,
        production: {
          activeOverride: productionCurrent
            ? mapOverride(productionCurrent)
            : null,
          scheduledOverride:
            productionScheduled
              ? mapOverride(productionScheduled)
              : null,
        },
        demo: {
          activeOverride: demoCurrent
            ? mapOverride(demoCurrent)
            : null,
          scheduledOverride: demoScheduled
            ? mapOverride(demoScheduled)
            : null,
        },
      }
    }),
  }
}
