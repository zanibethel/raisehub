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

type ActiveCampaignPricingRuleRow = {
  campaign_id: string | null
  pass_price: number
  platform_fee_percent: number
  starts_at: string
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
        'campaign_id, pass_price, platform_fee_percent, starts_at, reason'
      )
      .eq('scope_type', 'campaign')
      .eq('status', 'active')
      .returns<ActiveCampaignPricingRuleRow[]>(),
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

  const activeRuleByCampaignId = new Map(
    (activeRuleResult.data ?? [])
      .filter(
        (
          rule
        ): rule is ActiveCampaignPricingRuleRow & {
          campaign_id: string
        } => Boolean(rule.campaign_id)
      )
      .map((rule) => [
        rule.campaign_id,
        rule,
      ])
  )

  return {
    status: 'success',
    campaigns: (campaignResult.data ?? []).map(
      (campaign) => {
        const activeRule =
          activeRuleByCampaignId.get(campaign.id) ??
          null

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
        }
      }
    ),
  }
}
