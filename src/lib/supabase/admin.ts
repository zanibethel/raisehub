import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { DemoDatabase } from './demo-database.types'
import type { EnvironmentDatabase } from './environment-database.types'

// =============================================================================
// Unified privileged database type
// =============================================================================

// The generated database type currently trails a few newer RaiseHub tables and
// environment columns. Merge the supplemental environment and Demo Platform
// bridges so privileged server code remains strongly typed without `any`.
type AdminDatabase = Omit<EnvironmentDatabase, 'public'> & {
  public: Omit<EnvironmentDatabase['public'], 'Tables'> & {
    Tables: EnvironmentDatabase['public']['Tables'] &
      Pick<
        DemoDatabase['public']['Tables'],
        'demo_groups' | 'demo_profiles'
      >
  }
}

// =============================================================================
// Privileged Supabase client
// =============================================================================

/**
 * Creates a server-only Supabase client using the service-role key.
 *
 * Use this only after the caller has independently authenticated and validated
 * the requested operation with the normal cookie-based server client, or for a
 * narrowly scoped public route that performs its own strict allow-list checks.
 *
 * The service-role key bypasses Row Level Security and must never be imported
 * into a Client Component or exposed through a NEXT_PUBLIC environment value.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL for the Supabase admin client.'
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY for privileged server operations.'
    )
  }

  return createClient<AdminDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
