import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export type AnalyticsEnvironment = 'production' | 'demo'

export type PlatformMetrics = {
  businessCount: number
  completeBusinessCount: number
  incompleteBusinessCount: number
  businessesWithActiveOffersCount: number
  organizationCount: number
  organizationPayoutSetupCount: number
  activeCampaignCount: number
  draftCampaignCount: number
  inactiveCampaignCount: number
  activeOfferCount: number
  expiringOfferCount: number
  demoGroupCount: number
}

export type PlatformAnalyticsMetrics = {
  production: PlatformMetrics
  demo: PlatformMetrics
}

export type PlatformMetricsResult = {
  metrics: PlatformAnalyticsMetrics | null
  error: string | null
}

type BusinessProfileReadiness = {
  id: string
  business_name: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
}

type OrganizationWorkspace = {
  id: string
}

type StripeAccountReadiness = {
  organization_id: string
  payouts_enabled: boolean
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
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  return {
    now: now.toISOString(),
    sevenDaysFromNow: sevenDaysFromNow.toISOString(),
  }
}

async function getEnvironmentMetrics(
  environment: AnalyticsEnvironment
): Promise<{ metrics: PlatformMetrics | null; error: string | null }> {
  const supabase = await createClient()
  const isDemo = environment === 'demo'
  const { now, sevenDaysFromNow } = getExpiringOfferWindow()

  const [
    businessResult,
    organizationResult,
    activeCampaignResult,
    draftCampaignResult,
    inactiveCampaignResult,
    activeOfferResult,
    expiringOfferResult,
    organizationWorkspaceResult,
    stripeAccountResult,
    demoGroupResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, business_name, phone, address, logo_url', { count: 'exact' })
      .eq('role', 'business')
      .eq('is_demo', isDemo),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'organization')
      .eq('is_demo', isDemo),
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_demo', isDemo),
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft')
      .eq('is_demo', isDemo),
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'active')
      .eq('is_demo', isDemo),
    supabase
      .from('offers')
      .select('business_id', { count: 'exact' })
      .eq('is_active', true)
      .eq('is_demo', isDemo),
    supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_demo', isDemo)
      .not('ends_at', 'is', null)
      .gte('ends_at', now)
      .lte('ends_at', sevenDaysFromNow),
    supabase
      .from('organizations')
      .select('id')
      .eq('is_demo', isDemo),
    supabase
      .from('organization_stripe_accounts')
      .select('organization_id, payouts_enabled'),
    isDemo
      ? supabase
          .from('demo_groups')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'archived')
      : Promise.resolve({ count: 0, error: null }),
  ])

  const firstError =
    businessResult.error ??
    organizationResult.error ??
    activeCampaignResult.error ??
    draftCampaignResult.error ??
    inactiveCampaignResult.error ??
    activeOfferResult.error ??
    expiringOfferResult.error ??
    organizationWorkspaceResult.error ??
    stripeAccountResult.error ??
    demoGroupResult.error

  if (firstError) {
    return { metrics: null, error: firstError.message }
  }

  const businessProfiles =
    (businessResult.data ?? []) as BusinessProfileReadiness[]
  const incompleteBusinessCount = businessProfiles.filter(
    isBusinessProfileIncomplete
  ).length

  const activeOfferBusinessIds = new Set(
    (activeOfferResult.data ?? []).map((offer) => offer.business_id)
  )

  const organizationWorkspaces =
    (organizationWorkspaceResult.data ?? []) as OrganizationWorkspace[]
  const payoutReadyOrganizationIds = new Set(
    ((stripeAccountResult.data ?? []) as StripeAccountReadiness[])
      .filter((account) => account.payouts_enabled)
      .map((account) => account.organization_id)
  )
  const organizationPayoutSetupCount = organizationWorkspaces.filter(
    (organization) => !payoutReadyOrganizationIds.has(organization.id)
  ).length

  return {
    metrics: {
      businessCount: businessResult.count ?? 0,
      completeBusinessCount:
        (businessResult.count ?? 0) - incompleteBusinessCount,
      incompleteBusinessCount,
      businessesWithActiveOffersCount: activeOfferBusinessIds.size,
      organizationCount: organizationResult.count ?? 0,
      organizationPayoutSetupCount,
      activeCampaignCount: activeCampaignResult.count ?? 0,
      draftCampaignCount: draftCampaignResult.count ?? 0,
      inactiveCampaignCount: inactiveCampaignResult.count ?? 0,
      activeOfferCount: activeOfferResult.count ?? 0,
      expiringOfferCount: expiringOfferResult.count ?? 0,
      demoGroupCount: demoGroupResult.count ?? 0,
    },
    error: null,
  }
}

// =============================================================================
// Repository
// =============================================================================

export async function getPlatformMetrics(): Promise<PlatformMetricsResult> {
  const [productionResult, demoResult] = await Promise.all([
    getEnvironmentMetrics('production'),
    getEnvironmentMetrics('demo'),
  ])

  const error = productionResult.error ?? demoResult.error

  if (error || !productionResult.metrics || !demoResult.metrics) {
    return { metrics: null, error: error ?? 'Analytics metrics unavailable.' }
  }

  return {
    metrics: {
      production: productionResult.metrics,
      demo: demoResult.metrics,
    },
    error: null,
  }
}
