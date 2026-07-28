import { createClient } from '@/lib/supabase/server'
import { getPlatformMetrics } from '@/lib/repositories/platform-analytics-repository'
import type { PlatformAnalyticsMetrics } from '@/lib/repositories/platform-analytics-repository'

// =============================================================================
// Types
// =============================================================================

export type OwnerPlatformAnalyticsResult =
  | { status: 'success'; metrics: PlatformAnalyticsMetrics }
  | { status: 'unauthenticated' }
  | { status: 'owner-role-required' }
  | { status: 'metrics-lookup-failure' }

type ActorProfile = {
  role: string
}

// =============================================================================
// Service
// =============================================================================

export async function getOwnerPlatformAnalytics(): Promise<OwnerPlatformAnalyticsResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { status: 'unauthenticated' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<ActorProfile>()

  if (profileError || !profile) {
    return { status: 'metrics-lookup-failure' }
  }

  if (profile.role !== 'owner') {
    return { status: 'owner-role-required' }
  }

  const { metrics, error: metricsError } = await getPlatformMetrics()

  if (metricsError || !metrics) {
    return { status: 'metrics-lookup-failure' }
  }

  return { status: 'success', metrics }
}
