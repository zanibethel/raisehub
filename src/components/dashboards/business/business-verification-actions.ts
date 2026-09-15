'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

export type ApplyBusinessVerificationResult =
  | { success: true; status: string }
  | { success: false; error: string }

export async function applyBusinessVerificationAction(
  businessId: string
): Promise<ApplyBusinessVerificationResult> {
  const cleanBusinessId = businessId.trim()
  if (!cleanBusinessId) {
    return { success: false, error: 'Could not identify this business.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to apply for verification.' }
  }

  const { data, error } = await (supabase as any).rpc('apply_business_verification', {
    p_business_id: cleanBusinessId,
  })

  if (error) {
    const message = error.message?.toLowerCase() ?? ''
    if (message.includes('permission')) {
      return { success: false, error: 'Only a business owner or manager can apply for verification.' }
    }
    if (message.includes('not available')) {
      return { success: false, error: 'This business is not currently eligible to apply.' }
    }
    return { success: false, error: 'Could not submit verification right now. Please try again.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/rewards')
  revalidatePath('/dashboard/owner/business-verifications')

  return { success: true, status: data?.status ?? 'pending' }
}
