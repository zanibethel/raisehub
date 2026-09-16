'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function setFounderRewardsAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '').trim()
  const enabled = String(formData.get('enabled') ?? '') === 'true'
  const multiplierRaw = Number(formData.get('multiplier') ?? 1.25)
  const endsAtRaw = String(formData.get('endsAt') ?? '').trim()
  const multiplier = Number.isFinite(multiplierRaw) ? multiplierRaw : 1.25

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle<{ role: string }>()
  if (profile?.role !== 'owner') redirect('/dashboard')

  const { error } = await (supabase as any).rpc('set_business_founder_rewards', {
    p_business_id: businessId,
    p_enabled: enabled,
    p_multiplier: multiplier,
    p_ends_at: endsAtRaw ? new Date(`${endsAtRaw}T23:59:59`).toISOString() : null,
  })

  revalidatePath('/dashboard/owner/growth-rewards')
  revalidatePath('/dashboard/owner/businesses')
  redirect(`/dashboard/owner/growth-rewards?${error ? 'error=founder' : 'saved=founder'}`)
}
