import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import BusinessProfileForm from '@/app/components/business-profile-form'
import CanonicalBusinessProfileForm from '@/app/components/canonical-business-profile-form'
import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import { resolveWorkspaceSelection } from '@/lib/rules/workspace-selection-rules'
import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { canManageBusiness } from '@/lib/services/capability-resolution-service'
import { createClient } from '@/lib/supabase/server'
import type { LegacyProfileRole } from '@/lib/types/identity-access'

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'

type Profile = {
  role: LegacyProfileRole
  business_name: string | null
  phone: string | null
  address: string | null
  google_maps_url: string | null
  logo_url: string | null
  website_url: string | null
  display_name: string | null
}

type CanonicalBusiness = {
  id: string
  legacy_profile_id: string | null
  name: string | null
  legal_name: string | null
  phone: string | null
  address: string | null
  google_maps_url: string | null
  logo_url: string | null
  website_url: string | null
}

export default async function BusinessOffersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: actorProfile }, workspacesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, business_name, phone, address, google_maps_url, logo_url, website_url, display_name')
      .eq('id', user.id)
      .maybeSingle<Profile>(),
    getAuthenticatedWorkspaces(),
  ])

  const savedWorkspaceKey =
    (await cookies()).get(WORKSPACE_PREFERENCE_COOKIE)?.value.trim() || undefined
  const workspaces = workspacesResult.success ? workspacesResult.workspaces : []
  const selection = resolveWorkspaceSelection({
    requestedWorkspace: savedWorkspaceKey,
    workspaces,
    legacyRole: actorProfile?.role ?? 'customer',
  })
  const workspace = selection.selectedWorkspace

  if (selection.experienceRole !== 'business') {
    redirect('/dashboard')
  }

  const canonicalBusinessId =
    workspace?.kind === 'business' ? workspace.workspaceId : null
  const legacyProfileId =
    workspace?.kind === 'business' ? workspace.legacyProfileId : user.id

  let canonicalBusiness: CanonicalBusiness | null = null
  let canManageCanonicalBusiness = false

  if (canonicalBusinessId) {
    const [businessResult, manageResult] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, legacy_profile_id, name, legal_name, phone, address, google_maps_url, logo_url, website_url')
        .eq('id', canonicalBusinessId)
        .maybeSingle<CanonicalBusiness>(),
      canManageBusiness(canonicalBusinessId),
    ])

    canonicalBusiness = businessResult.data ?? null
    canManageCanonicalBusiness = manageResult.allowed
  }

  let legacyProfile: Profile | null = actorProfile ?? null
  if (legacyProfileId && legacyProfileId !== user.id) {
    const { data } = await supabase
      .from('profiles')
      .select('role, business_name, phone, address, google_maps_url, logo_url, website_url, display_name')
      .eq('id', legacyProfileId)
      .maybeSingle<Profile>()
    legacyProfile = data ?? null
  }

  const profileEditor = canonicalBusinessId && canonicalBusiness ? (
    canManageCanonicalBusiness ? (
      <CanonicalBusinessProfileForm
        businessId={canonicalBusiness.id}
        initialBusinessName={
          canonicalBusiness.legal_name || canonicalBusiness.name || ''
        }
        initialDisplayName={canonicalBusiness.name || ''}
        initialPhone={canonicalBusiness.phone || ''}
        initialAddress={canonicalBusiness.address || ''}
        initialGoogleMapsUrl={canonicalBusiness.google_maps_url || ''}
        initialLogoUrl={canonicalBusiness.logo_url || ''}
        initialWebsiteUrl={canonicalBusiness.website_url || ''}
      />
    ) : (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Business profile
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">
          Profile editing is restricted
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          You can review this workspace, but only business owners and managers can change its public profile or offers.
        </p>
      </div>
    )
  ) : (
    <BusinessProfileForm
      businessLegacyProfileId={legacyProfileId}
      initialBusinessName={legacyProfile?.business_name ?? ''}
      initialPhone={legacyProfile?.phone ?? ''}
      initialAddress={legacyProfile?.address ?? ''}
      initialGoogleMapsUrl={legacyProfile?.google_maps_url ?? ''}
      initialLogoUrl={legacyProfile?.logo_url ?? ''}
      initialWebsiteUrl={legacyProfile?.website_url ?? ''}
      initialDisplayName={legacyProfile?.display_name ?? ''}
    />
  )

  return (
    <main className="min-h-screen bg-[#F0F6FF]">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <section id="business-profile" className="mb-5 scroll-mt-24 sm:mb-6">
          {profileEditor}
        </section>

        <BusinessDashboard
          view="offers"
          businessId={canonicalBusinessId}
          businessLegacyProfileId={legacyProfileId}
        />
      </div>
    </main>
  )
}
