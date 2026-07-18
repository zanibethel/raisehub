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

  const { data, error } = await admin
    .from('campaigns')
    .select('id, name, is_demo')
    .order('name', { ascending: true })
    .returns<CampaignOptionRow[]>()

  if (error) {
    return {
      status: 'error',
      message:
        'Campaign pricing options could not be loaded.',
    }
  }

  return {
    status: 'success',
    campaigns: (data ?? []).map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      isDemo: campaign.is_demo,
      organizationName: null,
    })),
  }
}
