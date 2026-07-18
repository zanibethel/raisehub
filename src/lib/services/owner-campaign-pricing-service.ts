import 'server-only'

import type { OwnerCampaignPricingOption } from '@/components/dashboards/owner/owner-campaign-pricing-editor'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type OwnerCampaignPricingOptionsResult =
  | {
      status: 'success'
      campaigns: OwnerCampaignPricingOption[]
    }
  | {
      status:
        | 'unauthenticated'
        | 'owner-role-required'
        | 'error'
      message: string
    }

type CampaignOptionRow = {
  id: string
  name: string
  is_demo: boolean
}

type CampaignPricingRuleRow = {
  campaign_id: string | null
  pass_price: number
  platform_fee_percent: number
  starts_at: string
  expires_at: string | null
  reason: string | null
}

export async function getOwnerCampaignPricingOptions(): Promise<OwnerCampaignPricingOptionsResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: 'unauthenticated',
      message:
        'Sign in before viewing campaign pricing options.',
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
        'Unable to verify owner access for campaign pricing.',
    }
  }

  if (profile.role !== 'owner') {
    return {
      status: 'owner-role-required',
      message:
        'Owner access is required to manage campaign pricing.',
    }
  }

  const admin = createAdminClient()

  const [
    campaignResult,
    activeRuleResult,
  ] = await Promise.all([
    admin
      .from('campaigns')
      .select('id, name, is_demo')
      .order('name', { ascending: true })
      .returns<CampaignOptionRow[]>(),
    admin
      .from('pricing_rules')
      .select(
        'campaign_id, pass_price, platform_fee_percent, starts_at, expires_at, reason'
      )
      .eq('scope_type', 'campaign')
      .eq('status', 'active')
      .order('starts_at', {
        ascending: true,
      })
      .returns<CampaignPricingRuleRow[]>(),
  ])

  if (campaignResult.error) {
    return {
      status: 'error',
      message:
        'Campaign pricing options could not be loaded.',
    }
  }

  if (activeRuleResult.error) {
    return {
      status: 'error',
      message:
        'Active campaign pricing overrides could not be loaded.',
    }
  }

  const now = new Date()

  const currentRuleByCampaignId = new Map<
    string,
    CampaignPricingRuleRow & {
      campaign_id: string
    }
  >()

  const scheduledRuleByCampaignId = new Map<
    string,
    CampaignPricingRuleRow & {
      campaign_id: string
    }
  >()

  for (const rule of activeRuleResult.data ?? []) {
    if (!rule.campaign_id) {
      continue
    }

    const startsAt = new Date(rule.starts_at)
    const expiresAt = rule.expires_at
      ? new Date(rule.expires_at)
      : null

    const isCurrentlyEffective =
      startsAt <= now &&
      (!expiresAt || expiresAt > now)

    if (isCurrentlyEffective) {
      const existingCurrent =
        currentRuleByCampaignId.get(
          rule.campaign_id
        )

      if (
        !existingCurrent ||
        new Date(existingCurrent.starts_at) <
          startsAt
      ) {
        currentRuleByCampaignId.set(
          rule.campaign_id,
          {
            ...rule,
            campaign_id: rule.campaign_id,
          }
        )
      }

      continue
    }

    if (startsAt <= now) {
      continue
    }

    const existingScheduled =
      scheduledRuleByCampaignId.get(
        rule.campaign_id
      )

    if (
      !existingScheduled ||
      new Date(existingScheduled.starts_at) >
        startsAt
    ) {
      scheduledRuleByCampaignId.set(
        rule.campaign_id,
        {
          ...rule,
          campaign_id: rule.campaign_id,
        }
      )
    }
  }

  return {
    status: 'success',
    campaigns: (campaignResult.data ?? []).map(
      (campaign) => {
        const activeRule =
          currentRuleByCampaignId.get(
            campaign.id
          ) ?? null

        const scheduledRule =
          scheduledRuleByCampaignId.get(
            campaign.id
          ) ?? null

        return {
          id: campaign.id,
          name: campaign.name,
          isDemo: campaign.is_demo,
          organizationName: null,
          activeOverride: activeRule
            ? {
                passPrice:
                  activeRule.pass_price,
                platformFeePercent:
                  activeRule.platform_fee_percent,
                startsAt:
                  activeRule.starts_at,
                reason:
                  activeRule.reason,
              }
            : null,
          scheduledOverride: scheduledRule
            ? {
                passPrice:
                  scheduledRule.pass_price,
                platformFeePercent:
                  scheduledRule.platform_fee_percent,
                startsAt:
                  scheduledRule.starts_at,
                expiresAt:
                  scheduledRule.expires_at,
                reason:
                  scheduledRule.reason,
              }
            : null,
        }
      }
    ),
  }
}
