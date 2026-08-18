import 'server-only'

import {
  applyEnvironmentScope,
  getActiveDataEnvironment,
  type DataEnvironment,
  type EnvironmentOwnedRecord,
} from '@/lib/data-environment'
import { createAdminClient } from '@/lib/supabase/admin'

export type PublicPartnerProfile = EnvironmentOwnedRecord & {
  id: string
  role: string | null
  business_name: string | null
  display_name: string | null
  logo_url: string | null
  phone: string | null
  address: string | null
  website_url: string | null
  google_maps_url: string | null
}

export async function getPublicPartnerProfiles(
  profileIds: string[] | null,
  options: {
    role?: 'business' | 'organization'
    environment?: DataEnvironment
    limit?: number
  } = {}
): Promise<{ profiles: PublicPartnerProfile[]; error: string | null }> {
  const environment = options.environment ?? getActiveDataEnvironment()
  const admin = createAdminClient()
  let query = admin
    .from('profiles')
    .select(
      'id, role, business_name, display_name, logo_url, phone, address, website_url, google_maps_url, is_demo, demo_group'
    )

  if (profileIds) {
    const ids = [...new Set(profileIds.filter(Boolean))]
    if (ids.length === 0) return { profiles: [], error: null }
    query = query.in('id', ids)
  }

  if (options.role) query = query.eq('role', options.role)
  if (options.limit) query = query.limit(options.limit)

  const { data, error } = await applyEnvironmentScope(query, environment)

  return {
    profiles: (data ?? []) as PublicPartnerProfile[],
    error: error?.message ?? null,
  }
}
