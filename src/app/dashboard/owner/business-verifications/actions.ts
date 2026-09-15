'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function reviewBusinessVerificationAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '').trim()
  const decision = String(formData.get('decision') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()

  if (!businessId || !['approved', 'declined', 'revoked'].includes(decision)) {
    redirect('/dashboard/owner/business-verifications?error=invalid')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') redirect('/dashboard')

  const { error } = await (supabase as any).rpc('review_business_verification', {
    p_business_id: businessId,
    p_decision: decision,
    p_note: note || null,
  })

  if (error) {
    redirect('/dashboard/owner/business-verifications?error=review')
  }

  revalidatePath('/dashboard/owner/business-verifications')
  revalidatePath('/dashboard/rewards')
  revalidatePath('/dashboard')
  redirect(`/dashboard/owner/business-verifications?reviewed=${decision}`)
}
