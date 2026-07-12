import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export type PlatformMetrics = {
  businessCount: number
  organizationCount: number
  activeCampaignCount: number
  activeOfferCount: number
}

export type PlatformMetricsResult = {
  metrics: PlatformMetrics | null
  error: string | null
}

// =============================================================================
// Repository
// =============================================================================

export async function getPlatformMetrics(): Promise<PlatformMetricsResult> {
  const supabase = await createClient()

  const [
    { count: businessCount, error: businessError },
    { count: orgCount, error: orgError },
    { count: campaignCount, error: campaignError },
    { count: offerCount, error: offerError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'business'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'organization'),
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  const firstError =
    businessError ?? orgError ?? campaignError ?? offerError

  if (firstError) {
    return { metrics: null, error: firstError.message }
  }

  return {
    metrics: {
      businessCount: businessCount ?? 0,
      organizationCount: orgCount ?? 0,
      activeCampaignCount: campaignCount ?? 0,
      activeOfferCount: offerCount ?? 0,
    },
    error: null,
  }
}
