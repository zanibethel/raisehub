'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type SellerProfileActionState = {
  success: boolean
  message: string
}

export async function updateSellerProfileAction(
  _previousState: SellerProfileActionState,
  formData: FormData
): Promise<SellerProfileActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Sign in to update your seller profile.' }
  }

  const displayName = String(formData.get('displayName') ?? '').trim()
  const bio = String(formData.get('bio') ?? '').trim()
  const avatarUrl = String(formData.get('avatarUrl') ?? '').trim()

  if (displayName.length < 2 || displayName.length > 80) {
    return {
      success: false,
      message: 'Display name must be between 2 and 80 characters.',
    }
  }

  if (bio.length > 280) {
    return { success: false, message: 'Bio must be 280 characters or fewer.' }
  }

  if (avatarUrl && !/^https:\/\//i.test(avatarUrl)) {
    return {
      success: false,
      message: 'Profile image must use a secure https:// URL.',
    }
  }

  const admin = createAdminClient() as any
  const { data: profile, error: lookupError } = await admin
    .from('seller_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (lookupError) {
    return { success: false, message: lookupError.message }
  }

  const payload = {
    display_name: displayName,
    bio: bio || null,
    avatar_url: avatarUrl || null,
    status: 'active',
    updated_at: new Date().toISOString(),
  }

  const result = profile
    ? await admin.from('seller_profiles').update(payload).eq('id', profile.id)
    : await admin.from('seller_profiles').insert({
        user_id: user.id,
        ...payload,
      })

  if (result.error) {
    return { success: false, message: result.error.message }
  }

  await admin
    .from('organization_memberships')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('membership_role', 'seller')

  revalidatePath('/seller/dashboard')
  revalidatePath('/dashboard')

  return { success: true, message: 'Seller profile updated.' }
}
