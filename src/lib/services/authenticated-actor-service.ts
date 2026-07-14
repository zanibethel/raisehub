import { createClient } from '../supabase/server'
import { getProfileById } from '../repositories/profile-repository'
import { isLegacyProfileRole } from '../rules/identity-access-rules'
import type { AuthenticatedActor } from '../types/identity-access'

export type AuthenticatedActorResult =
  | {
      authenticated: true
      actor: AuthenticatedActor
    }
  | {
      authenticated: false
      reason: 'unauthenticated' | 'lookup-failure'
      message: string
    }

export async function getAuthenticatedActor(): Promise<AuthenticatedActorResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      authenticated: false,
      reason: 'unauthenticated',
      message: 'No authenticated session.',
    }
  }

  const { profile, error } = await getProfileById(user.id)

  if (error || !profile) {
    return {
      authenticated: false,
      reason: 'lookup-failure',
      message: 'Unable to load actor profile.',
    }
  }

  return {
    authenticated: true,
    actor: {
      id: profile.id,
      email: profile.email,
      legacyRole: isLegacyProfileRole(profile.role)
        ? profile.role
        : null,
    },
  }
}
