'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createBusinessReferralAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  if (!businessId) return { success: false, error: 'Business not found.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sign in required.' }

  const { data, error } = await (supabase as any).rpc('create_business_referral', {
    p_referring_business_id: businessId,
    p_email: email || null,
  })

  if (error) return { success: false, error: error.message ?? 'Could not create referral.' }
  revalidatePath('/dashboard/rewards/referrals')
  const row = Array.isArray(data) ? data[0] : data
  return { success: true, token: row?.referral_token ?? null }
}
