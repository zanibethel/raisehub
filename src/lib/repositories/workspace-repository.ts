import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export type WorkspaceProfileRole =
  | 'business'
  | 'organization'
  | 'customer'

export type WorkspaceProfile = {
  id: string
  email: string | null
  role: WorkspaceProfileRole
  full_name: string | null
  business_name: string | null
  display_name: string | null
  subscription_tier: string
  onboarding_completed: boolean
}

type WorkspaceProfilesResult = {
  profiles: WorkspaceProfile[]
  error: string | null
}

// =============================================================================
// Repository
// =============================================================================

export async function getWorkspaceProfiles(): Promise<WorkspaceProfilesResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
        id,
        email,
        role,
        full_name,
        business_name,
        display_name,
        subscription_tier,
        onboarding_completed
      `
    )
    .in('role', ['business', 'organization', 'customer'])

  if (error) {
    return {
      profiles: [],
      error: error.message,
    }
  }

  return {
    profiles: (data ?? []) as WorkspaceProfile[],
    error: null,
  }
}