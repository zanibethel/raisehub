import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  DemoDatabase,
  DemoProfileRow,
} from '@/lib/supabase/demo-database.types'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export type DemoProfileRole =
  | 'customer'
  | 'business'
  | 'organization'
  | 'admin'
  | 'owner'
  | 'support'

export type CreatePortableDemoProfileInput = {
  groupKey: string
  label: string
  role: DemoProfileRole
  isPrimary?: boolean
}

export type CreatePortableDemoProfileResult = {
  profile: DemoProfileRow | null
  error: string | null
}

export type DemoProfileMutationResult = {
  success: boolean
  error: string | null
}

// =============================================================================
// Helpers
// =============================================================================

function toDemoClient(
  client: Awaited<ReturnType<typeof createClient>>
): SupabaseClient<DemoDatabase> {
  return client as unknown as SupabaseClient<DemoDatabase>
}

function createProfileSlug(
  label: string,
  role: DemoProfileRole
) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const suffix = Date.now()
    .toString(36)
    .slice(-6)

  return `${base || role}-${suffix}`
}

async function requireSignedInUser() {
  const baseClient = await createClient()

  const {
    data: authData,
    error: authError,
  } = await baseClient.auth.getUser()

  if (authError || !authData.user) {
    return {
      baseClient,
      userId: null,
      error:
        'You must be signed in to manage demo profiles.',
    }
  }

  return {
    baseClient,
    userId: authData.user.id,
    error: null,
  }
}

// =============================================================================
// Repository
// =============================================================================

export async function createPortableDemoProfile(
  input: CreatePortableDemoProfileInput
): Promise<CreatePortableDemoProfileResult> {
  const label = input.label.trim()
  const groupKey = input.groupKey.trim()

  if (!groupKey) {
    return {
      profile: null,
      error: 'Demo group key is required.',
    }
  }

  if (!label) {
    return {
      profile: null,
      error: 'Demo profile name is required.',
    }
  }

  const auth = await requireSignedInUser()

  if (auth.error || !auth.userId) {
    return {
      profile: null,
      error: auth.error,
    }
  }

  const supabase =
    toDemoClient(auth.baseClient)

  const {
    data: group,
    error: groupError,
  } = await supabase
    .from('demo_groups')
    .select('id')
    .eq('group_key', groupKey)
    .maybeSingle()

  if (groupError) {
    return {
      profile: null,
      error: groupError.message,
    }
  }

  if (!group) {
    return {
      profile: null,
      error: 'Demo group not found.',
    }
  }

  if (input.isPrimary) {
    const { error: clearPrimaryError } =
      await supabase
        .from('demo_profiles')
        .update({
          is_primary: false,
        })
        .eq('demo_group_id', group.id)
        .eq('role', input.role)
        .eq('is_primary', true)

    if (clearPrimaryError) {
      return {
        profile: null,
        error: clearPrimaryError.message,
      }
    }
  }

  const slug = createProfileSlug(
    label,
    input.role
  )

  const {
    data: profile,
    error: insertError,
  } = await supabase
    .from('demo_profiles')
    .insert({
      demo_group_id: group.id,
      profile_id: null,
      slug,
      label,
      role: input.role,
      status: 'active',
      is_primary:
        input.isPrimary ?? false,
      baseline_data: {
        label,
        role: input.role,
        source: 'owner_demo_center',
      },
      metadata: {
        created_by:
          auth.userId,
        portable: true,
      },
    })
    .select('*')
    .single()

  if (insertError) {
    return {
      profile: null,
      error: insertError.message,
    }
  }

  return {
    profile,
    error: null,
  }
}

export async function setDemoProfilePrimary(
  profileId: string
): Promise<DemoProfileMutationResult> {
  const auth = await requireSignedInUser()

  if (auth.error || !auth.userId) {
    return {
      success: false,
      error: auth.error,
    }
  }

  const supabase =
    toDemoClient(auth.baseClient)

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('demo_profiles')
    .select(
      'id, demo_group_id, role'
    )
    .eq('id', profileId)
    .maybeSingle()

  if (profileError) {
    return {
      success: false,
      error: profileError.message,
    }
  }

  if (!profile) {
    return {
      success: false,
      error: 'Demo profile not found.',
    }
  }

  const { error: clearError } =
    await supabase
      .from('demo_profiles')
      .update({
        is_primary: false,
      })
      .eq(
        'demo_group_id',
        profile.demo_group_id
      )
      .eq('role', profile.role)

  if (clearError) {
    return {
      success: false,
      error: clearError.message,
    }
  }

  const { error: updateError } =
    await supabase
      .from('demo_profiles')
      .update({
        is_primary: true,
      })
      .eq('id', profile.id)

  if (updateError) {
    return {
      success: false,
      error: updateError.message,
    }
  }

  return {
    success: true,
    error: null,
  }
}

export async function setDemoProfileArchived(
  profileId: string,
  archived: boolean
): Promise<DemoProfileMutationResult> {
  const auth = await requireSignedInUser()

  if (auth.error || !auth.userId) {
    return {
      success: false,
      error: auth.error,
    }
  }

  const supabase =
    toDemoClient(auth.baseClient)

  const updateValues = archived
    ? {
        status: 'archived' as const,
        is_primary: false,
      }
    : {
        status: 'active' as const,
      }

  const { error } = await supabase
    .from('demo_profiles')
    .update(updateValues)
    .eq('id', profileId)

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: true,
    error: null,
  }
}

export async function deletePortableDemoProfile(
  profileId: string
): Promise<DemoProfileMutationResult> {
  const auth = await requireSignedInUser()

  if (auth.error || !auth.userId) {
    return {
      success: false,
      error: auth.error,
    }
  }

  const supabase =
    toDemoClient(auth.baseClient)

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('demo_profiles')
    .select('id, profile_id')
    .eq('id', profileId)
    .maybeSingle()

  if (profileError) {
    return {
      success: false,
      error: profileError.message,
    }
  }

  if (!profile) {
    return {
      success: false,
      error: 'Demo profile not found.',
    }
  }

  if (profile.profile_id) {
    return {
      success: false,
      error:
        'Linked demo profiles must be unlinked before permanent deletion.',
    }
  }

  const { error: deleteError } =
    await supabase
      .from('demo_profiles')
      .delete()
      .eq('id', profile.id)

  if (deleteError) {
    return {
      success: false,
      error: deleteError.message,
    }
  }

  return {
    success: true,
    error: null,
  }
}
