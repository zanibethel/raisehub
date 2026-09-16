import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { resolveWorkspaceSelection } from '@/lib/rules/workspace-selection-rules'
import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { LegacyProfileRole } from '@/lib/types/identity-access'

import ReferralClient from './referral-client'

export const metadata = { title: 'Business Referrals | RaiseHub' }

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'
type Profile = { role: LegacyProfileRole }

export default async function BusinessReferralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard/rewards/referrals')

  const [{ data: profile }, workspacesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<Profile>(),
    getAuthenticatedWorkspaces(),
  ])

  const savedWorkspaceKey =
    (await cookies()).get(WORKSPACE_PREFERENCE_COOKIE)?.value.trim() || undefined
  const workspaces = workspacesResult.success ? workspacesResult.workspaces : []
  const selection = resolveWorkspaceSelection({
    requestedWorkspace: savedWorkspaceKey,
    workspaces,
    legacyRole: profile?.role ?? 'customer',
  })
  const workspace = selection.selectedWorkspace

  if (selection.experienceRole !== 'business' || workspace?.kind !== 'business' || !workspace.workspaceId) {
    redirect('/dashboard')
  }

  const businessId = workspace.workspaceId
  const admin = createAdminClient() as any
  await admin.rpc('sync_business_growth_rewards', { p_business_id: businessId })

  const { data: reportData } = await admin
    .from('partner_referral_report')
    .select('id,referred_business_name,attributed_email,status,referral_token,referral_points_awarded,attributed_at')
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
