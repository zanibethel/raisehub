import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  DemoDatabase,
  DemoGroupRow,
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

export type DemoGroupsResult = {
  groups: DemoGroupSummary[]
  error: string | null
}

type DemoProfileGroupReference = {
  demo_group_id: string
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
