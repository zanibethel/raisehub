import { createBrowserClient } from '@supabase/ssr'

/**
 * Returns the Supabase browser client.
 *
 * IMPORTANT: This client is only valid in browser environments.
 * It must be called from event handlers or `useEffect` callbacks —
 * never from the synchronous component render body — to avoid issues
 * in environments where Supabase env vars are not configured.
 *
 * During server-side rendering (build time without env vars), the function
 * returns null to prevent `createBrowserClient` from throwing. Any call
 * to Supabase methods on the returned value during SSR is a bug in the
 * calling component.
 */
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
