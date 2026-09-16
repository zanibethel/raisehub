import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import ReferralClient from './referral-client'

export const metadata = { title: 'Business Referrals | RaiseHub' }

export default async function BusinessReferralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard/rewards/referrals')

  const { data: memberships } = await (supabase as any)
    .from('business_memberships')
    .select('business_id,membership_role,status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('membership_role', ['owner','manager'])
    .limit(1)

  const businessId = memberships?.[0]?.business_id as string | undefined
  if (!businessId) redirect('/dashboard')

  const admin = createAdminClient() as any
  await admin.rpc('sync_business_growth_rewards', { p_business_id: businessId })
  const { data: reportData } = await admin
    .from('partner_referral_report')
    .select('id,referred_business_name,attributed_email,status,referral_token,referral_points_awarded')
    .eq('referring_business_id', businessId)
    .order('attributed_at', { ascending: false, nullsFirst: false })

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/rewards" className="text-sm font-black text-blue-700">← Back to Partner Rewards</Link>
        <div className="mt-4">
          <ReferralClient businessId={businessId} referrals={(reportData ?? []) as any[]} />
        </div>
      </div>
    </main>
  )
}
