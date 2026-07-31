import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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
  metrics: PlatformMetrics | null
  error: string | null
}

export type PlatformAnalyticsMetricsResult = {
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

type OrganizationWorkspace = { id: string }
type StripeAccountReadiness = {
  organization_id: string
  payouts_enabled: boolean
}

type StripeAccountQueryResult = {
  data: StripeAccountReadiness[] | null
  error: { message: string } | null
}

type StripeAccountAdminClient = {
  from: (relation: 'organization_stripe_accounts') => {
    select: (
      columns: 'organization_id, payouts_enabled'
    ) => PromiseLike<StripeAccountQueryResult>
  }
}

type EnvironmentQuery<T> = T & {
  eq(column: string, value: unknown): T
  is(column: string, value: null): T
  not(column: string, operator: string, value: null): T
}

function applyAnalyticsEnvironmentScope<T>(
  query: EnvironmentQuery<T>,
  environment: AnalyticsEnvironment
): T {
  if (environment === 'production') {
    return query.eq('is_demo', false).is('demo_group', null)
  }

  // Owner analytics intentionally aggregates every valid demo group while
  // excluding ambiguous demo rows that have no group ownership.
  return query.eq('is_demo', true).not('demo_group', 'is', null)
}

function isBusinessProfileIncomplete(profile: BusinessProfileReadiness): boolean {
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
): Promise<PlatformMetricsResult> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient() as unknown as StripeAccountAdminClient
  const { now, sevenDaysFromNow } = getExpiringOfferWindow()

  const businessQuery = supabase
    .from('profiles')
    .select('id, business_name, phone, address, logo_url', { count: 'exact' })
    .eq('role', 'business')
  const organizationQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'organization')
  const activeCampaignQuery = supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  const draftCampaignQuery = supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')
  const inactiveCampaignQuery = supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'active')
  const activeOfferQuery = supabase
    .from('offers')
    .select('business_id', { count: 'exact' })
    .eq('is_active', true)
  const expiringOfferQuery = supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('ends_at', 'is', null)
    .gte('ends_at', now)
    .lte('ends_at', sevenDaysFromNow)
  const workspaceQuery = supabase.from('organizations').select('id')

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
    applyAnalyticsEnvironmentScope(businessQuery, environment),
    applyAnalyticsEnvironmentScope(organizationQuery, environment),
    applyAnalyticsEnvironmentScope(activeCampaignQuery, environment),
    applyAnalyticsEnvironmentScope(draftCampaignQuery, environment),
    applyAnalyticsEnvironmentScope(inactiveCampaignQuery, environment),
    applyAnalyticsEnvironmentScope(activeOfferQuery, environment),
    applyAnalyticsEnvironmentScope(expiringOfferQuery, environment),
    applyAnalyticsEnvironmentScope(workspaceQuery, environment),
    adminSupabase
      .from('organization_stripe_accounts')
      .select('organization_id, payouts_enabled'),
    environment === 'demo'
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

  if (firstError) return { metrics: null, error: firstError.message }

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
    (stripeAccountResult.data ?? [])
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

export async function getPlatformMetrics(): Promise<PlatformMetricsResult> {
  return getEnvironmentMetrics('production')
}

export async function getPlatformAnalyticsMetrics(): Promise<PlatformAnalyticsMetricsResult> {
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
