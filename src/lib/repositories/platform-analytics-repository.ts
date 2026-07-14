import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export type PlatformMetrics = {
  businessCount: number
  organizationCount: number
  activeCampaignCount: number
  activeOfferCount: number
  incompleteBusinessCount: number
  expiringOfferCount: number
  inactiveCampaignCount: number
}

export type PlatformMetricsResult = {
  metrics: PlatformMetrics | null
  error: string | null
}

type BusinessProfileReadiness = {
  business_name: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
}

// =============================================================================
// Helpers
// =============================================================================

function isBusinessProfileIncomplete(
  profile: BusinessProfileReadiness
): boolean {
  return !(
    profile.business_name?.trim() &&
    profile.phone?.trim() &&
    profile.address?.trim() &&
    profile.logo_url?.trim()
  )
}

function getExpiringOfferWindow() {
  const now = new Date()
  const sevenDaysFromNow = new Date(now)

  sevenDaysFromNow.setDate(
    sevenDaysFromNow.getDate() + 7
  )

  return {
    now: now.toISOString(),
    sevenDaysFromNow:
      sevenDaysFromNow.toISOString(),
  }
}

// =============================================================================
// Repository
// =============================================================================

export async function getPlatformMetrics(): Promise<PlatformMetricsResult> {
  const supabase = await createClient()

  const {
    now,
    sevenDaysFromNow,
  } = getExpiringOfferWindow()

  const [
    {
      data: businessProfiles,
      count: businessCount,
      error: businessError,
    },
    {
      count: organizationCount,
      error: organizationError,
    },
    {
      count: activeCampaignCount,
      error: activeCampaignError,
    },
    {
      count: activeOfferCount,
      error: activeOfferError,
    },
    {
      count: expiringOfferCount,
      error: expiringOfferError,
    },
    {
      count: inactiveCampaignCount,
      error: inactiveCampaignError,
    },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'business_name, phone, address, logo_url',
        {
          count: 'exact',
        }
      )
      .eq('role', 'business'),

    supabase
      .from('profiles')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('role', 'organization'),

    supabase
      .from('campaigns')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'active'),

    supabase
      .from('offers')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('is_active', true),

    supabase
      .from('offers')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('is_active', true)
      .not('ends_at', 'is', null)
      .gte('ends_at', now)
      .lte('ends_at', sevenDaysFromNow),

    supabase
      .from('campaigns')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .neq('status', 'active'),
  ])

  const firstError =
    businessError ??
    organizationError ??
    activeCampaignError ??
    activeOfferError ??
    expiringOfferError ??
    inactiveCampaignError

  if (firstError) {
    return {
      metrics: null,
      error: firstError.message,
    }
  }

  const incompleteBusinessCount =
    (businessProfiles ?? []).filter(
      isBusinessProfileIncomplete
    ).length

  return {
    metrics: {
      businessCount: businessCount ?? 0,
      organizationCount:
        organizationCount ?? 0,
      activeCampaignCount:
        activeCampaignCount ?? 0,
      activeOfferCount:
        activeOfferCount ?? 0,
      incompleteBusinessCount,
      expiringOfferCount:
        expiringOfferCount ?? 0,
      inactiveCampaignCount:
        inactiveCampaignCount ?? 0,
    },
    error: null,
  }
}
