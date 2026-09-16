'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function reviewBusinessOfferAction(formData: FormData) {
  const offerId = String(formData.get('offerId') ?? '').trim()
  const decision = String(formData.get('decision') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()

  if (!offerId || !['approved', 'declined'].includes(decision)) {
    redirect('/dashboard/owner/offer-reviews?error=invalid')
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

  const { error } = await (supabase as any).rpc('review_business_offer', {
    p_offer_id: offerId,
    p_decision: decision,
    p_note: note || null,
  })

  if (error) {
    const message = (error.message ?? '').toLowerCase()
    const reason = message.includes('verify this business') ? 'verify-business' : 'review'
    redirect(`/dashboard/owner/offer-reviews?error=${reason}`)
  }

  revalidatePath('/dashboard/owner/offer-reviews')
  revalidatePath('/dashboard/owner/business-verifications')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/offers')
  revalidatePath('/offers')
  redirect(`/dashboard/owner/offer-reviews?reviewed=${decision}`)
}
