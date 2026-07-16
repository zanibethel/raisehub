import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { GiftPassDatabase } from './gift-pass-database.types'

// =============================================================================
// Privileged Supabase client
// =============================================================================

/**
 * Creates a server-only Supabase client using the service-role key.
 *
 * Use this only after the caller has independently authenticated and validated
 * the requested operation with the normal cookie-based server client.
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

  return createClient<GiftPassDatabase>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  )
}
