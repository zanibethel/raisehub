'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { executePartnerRewardPayout } from '@/lib/services/partner-rewards-payout-service'
import { createClient } from '@/lib/supabase/server'

const PAYOUTS_PATH = '/dashboard/owner/partner-rewards/payouts'

export async function payPartnerRewardAwardAction(formData: FormData) {
  const awardId = String(formData.get('awardId') ?? '').trim()
  if (!awardId) redirect(`${PAYOUTS_PATH}?error=invalid_award`)

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
  revalidatePath(PAYOUTS_PATH)
  revalidatePath('/dashboard')

  if (!result.ok) {
    redirect(`${PAYOUTS_PATH}?error=${encodeURIComponent(result.error)}`)
  }

  redirect(`${PAYOUTS_PATH}?paid=${encodeURIComponent(result.stripeTransferId)}`)
}
