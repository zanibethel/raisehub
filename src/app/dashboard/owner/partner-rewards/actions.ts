'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { executePartnerRewardPayout } from '@/lib/services/partner-rewards-payout-service'
import { createClient } from '@/lib/supabase/server'

export async function payPartnerRewardAwardAction(formData: FormData) {
  const awardId = String(formData.get('awardId') ?? '').trim()
  if (!awardId) redirect('/dashboard/owner/partner-rewards?error=invalid_award')

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

  const result = await executePartnerRewardPayout(awardId, user.id)

  revalidatePath('/dashboard/owner/partner-rewards')
  revalidatePath('/dashboard')

  if (!result.ok) {
    redirect(`/dashboard/owner/partner-rewards?error=${encodeURIComponent(result.error)}`)
  }

  redirect(`/dashboard/owner/partner-rewards?paid=${encodeURIComponent(result.stripeTransferId)}`)
}
