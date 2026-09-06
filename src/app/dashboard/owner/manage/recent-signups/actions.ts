'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

type ReviewStatus = 'new' | 'reviewed' | 'needs_attention'

export async function updateSignupReview(formData: FormData) {
  const profileId = String(formData.get('profile_id') ?? '')
  const status = String(formData.get('status') ?? '') as ReviewStatus

  if (!profileId || !['new', 'reviewed', 'needs_attention'].includes(status)) {
    return
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (ownerProfile?.role !== 'owner') redirect('/dashboard')

  await supabase.from('owner_signup_reviews').upsert(
    {
      profile_id: profileId,
      status,
      reviewed_by: status === 'new' ? null : user.id,
      reviewed_at: status === 'new' ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' }
  )

  revalidatePath('/dashboard/owner/manage')
  revalidatePath('/dashboard/owner/manage/recent-signups')
}
