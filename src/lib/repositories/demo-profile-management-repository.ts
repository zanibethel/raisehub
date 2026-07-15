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

  const baseClient = await createClient()
  const supabase = toDemoClient(baseClient)

  const {
    data: authData,
    error: authError,
  } = await baseClient.auth.getUser()

  if (authError || !authData.user) {
    return {
      profile: null,
      error:
        'You must be signed in to create a demo profile.',
    }
  }

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
          authData.user.id,
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
