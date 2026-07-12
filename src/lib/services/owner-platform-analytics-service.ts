import { createClient } from '@/lib/supabase/server'
import { getPlatformMetrics } from '@/lib/repositories/platform-analytics-repository'
import type { PlatformMetrics } from '@/lib/repositories/platform-analytics-repository'

// =============================================================================
// Types
// =============================================================================

export type OwnerPlatformAnalyticsResult =
  | { status: 'success'; metrics: PlatformMetrics }
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

  // Step 1: Verify an authenticated session exists.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { status: 'unauthenticated' }
  }

  // Step 2: Load the actor's stored profile and confirm the role is owner.
  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<ActorProfile>()

  if (profileError || !profile) {
    return { status: 'owner-role-required' }
  }

  if (profile.role !== 'owner') {
    return { status: 'owner-role-required' }
  }

  // Step 3: Query platform metrics only after owner verification.
  const { metrics, error: metricsError } =
    await getPlatformMetrics()

  if (metricsError || !metrics) {
    return { status: 'metrics-lookup-failure' }
  }

  return { status: 'success', metrics }
}
