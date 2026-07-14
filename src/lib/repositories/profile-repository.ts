import { createClient } from '../supabase/server'
import type { ActorProfile } from '../types/identity-access'

const PROFILE_SELECT_COLUMNS = 'id, email, role'

type ProfileResult = {
  profile: ActorProfile | null
  error: string | null
}

export async function getProfileById(
  profileId: string
): Promise<ProfileResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_COLUMNS)
    .eq('id', profileId)
    .maybeSingle<ActorProfile>()

  if (error) {
    return {
      profile: null,
      error: error.message,
    }
  }

  return {
    profile: data,
    error: null,
  }
}
