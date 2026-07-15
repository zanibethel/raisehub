import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  DemoDatabase,
  DemoGroupRow,
  DemoProfileRow,
} from '@/lib/supabase/demo-database.types'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export type DemoGroupSummary = {
  id: string
  groupKey: string
  name: string
  description: string | null
  scenarioType: string
  status: string
  isDefault: boolean
  profileCount: number
  createdAt: string
  updatedAt: string
}

export type DemoProfileSummary = {
  id: string
  profileId: string | null
  slug: string
  label: string
  role: string
  status: string
  isPrimary: boolean
  email: string | null
  displayName: string | null
  createdAt: string
  updatedAt: string
}

export type DemoGroupDetails = {
  group: DemoGroupSummary
  profiles: DemoProfileSummary[]
}

export type DemoGroupsResult = {
  groups: DemoGroupSummary[]
  error: string | null
}

export type DemoGroupDetailsResult = {
  details: DemoGroupDetails | null
  error: string | null
}

type DemoProfileGroupReference = {
  demo_group_id: string
}

type LinkedProfileReference = {
  id: string
  email: string | null
  display_name: string | null
  full_name: string | null
  business_name: string | null
}

// =============================================================================
// Helpers
// =============================================================================

function toDemoClient(
  client: Awaited<ReturnType<typeof createClient>>
): SupabaseClient<DemoDatabase> {
  return client as unknown as SupabaseClient<DemoDatabase>
}

function countProfilesByGroup(
  profiles: DemoProfileGroupReference[]
) {
  return profiles.reduce<Record<string, number>>(
    (counts, profile) => {
      counts[profile.demo_group_id] =
        (counts[profile.demo_group_id] ?? 0) + 1

      return counts
    },
    {}
  )
}

function toDemoGroupSummary(
  group: DemoGroupRow,
  profileCount: number
): DemoGroupSummary {
  return {
    id: group.id,
    groupKey: group.group_key,
    name: group.name,
    description: group.description,
    scenarioType: group.scenario_type,
    status: group.status,
    isDefault: group.is_default,
    profileCount,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  }
}

function getLinkedProfileName(
  profile: LinkedProfileReference | undefined
) {
  return (
    profile?.display_name?.trim() ||
    profile?.business_name?.trim() ||
    profile?.full_name?.trim() ||
    null
  )
}

function toDemoProfileSummary(
  demoProfile: DemoProfileRow,
  linkedProfile: LinkedProfileReference | undefined
): DemoProfileSummary {
  return {
    id: demoProfile.id,
    profileId: demoProfile.profile_id,
    slug: demoProfile.slug,
    label: demoProfile.label,
    role: demoProfile.role,
    status: demoProfile.status,
    isPrimary: demoProfile.is_primary,
    email: linkedProfile?.email ?? null,
    displayName:
      getLinkedProfileName(linkedProfile),
    createdAt: demoProfile.created_at,
    updatedAt: demoProfile.updated_at,
  }
}

// =============================================================================
// Repository
// =============================================================================

export async function getDemoGroups(): Promise<DemoGroupsResult> {
  const baseClient = await createClient()
  const supabase = toDemoClient(baseClient)

  const [
    { data: groups, error: groupsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase
      .from('demo_groups')
      .select('*')
      .order('is_default', {
        ascending: false,
      })
      .order('name', {
        ascending: true,
      }),

    supabase
      .from('demo_profiles')
      .select('demo_group_id'),
  ])

  const firstError =
    groupsError ?? profilesError

  if (firstError) {
    return {
      groups: [],
      error: firstError.message,
    }
  }

  const profileCounts =
    countProfilesByGroup(profiles ?? [])

  return {
    groups: (groups ?? []).map(
      (group) =>
        toDemoGroupSummary(
          group,
          profileCounts[group.id] ?? 0
        )
    ),
    error: null,
  }
}

export async function getDemoGroupDetails(
  groupKey: string
): Promise<DemoGroupDetailsResult> {
  const baseClient = await createClient()
  const supabase = toDemoClient(baseClient)

  const {
    data: group,
    error: groupError,
  } = await supabase
    .from('demo_groups')
    .select('*')
    .eq('group_key', groupKey)
    .maybeSingle()

  if (groupError) {
    return {
      details: null,
      error: groupError.message,
    }
  }

  if (!group) {
    return {
      details: null,
      error: 'Demo group not found.',
    }
  }

  const {
    data: demoProfiles,
    error: demoProfilesError,
  } = await supabase
    .from('demo_profiles')
    .select('*')
    .eq('demo_group_id', group.id)
    .order('is_primary', {
      ascending: false,
    })
    .order('role', {
      ascending: true,
    })
    .order('label', {
      ascending: true,
    })

  if (demoProfilesError) {
    return {
      details: null,
      error: demoProfilesError.message,
    }
  }

  const profileIds = (demoProfiles ?? [])
    .map((profile) => profile.profile_id)
    .filter(
      (profileId): profileId is string =>
        Boolean(profileId)
    )

  let linkedProfiles: LinkedProfileReference[] = []

  if (profileIds.length > 0) {
    const {
      data,
      error: linkedProfilesError,
    } = await baseClient
      .from('profiles')
      .select(
        'id, email, display_name, full_name, business_name'
      )
      .in('id', profileIds)

    if (linkedProfilesError) {
      return {
        details: null,
        error: linkedProfilesError.message,
      }
    }

    linkedProfiles =
      (data ?? []) as LinkedProfileReference[]
  }

  const linkedProfilesById = new Map(
    linkedProfiles.map((profile) => [
      profile.id,
      profile,
    ])
  )

  const profiles = (demoProfiles ?? []).map(
    (demoProfile) =>
      toDemoProfileSummary(
        demoProfile,
        demoProfile.profile_id
          ? linkedProfilesById.get(
              demoProfile.profile_id
            )
          : undefined
      )
  )

  return {
    details: {
      group: toDemoGroupSummary(
        group,
        profiles.length
      ),
      profiles,
    },
    error: null,
  }
}
