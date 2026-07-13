import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // createBrowserClient validates env vars on construction and must only run
  // in a browser environment. Guard against SSR so that client components
  // that initialize the client in their render body don't cause build failures
  // in environments where NEXT_PUBLIC_SUPABASE_URL is not yet configured.
  // All actual Supabase operations should be called from effects or handlers.
  if (typeof window === 'undefined') {
    return null as unknown as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
