import Link from 'next/link'
import { redirect } from 'next/navigation'

import ReadOnlyWorkspaceView from '@/components/platform/read-only-workspace-view'
import SelectedWorkspacePanel, {
  type WorkspaceSupportMode,
} from '@/components/platform/selected-workspace-panel'
import WorkspaceSelector from '@/components/platform/workspace-selector'
import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'
import type { OwnerBusinessOffersResult } from '@/lib/services/owner-business-offer-service'
import { getOwnerAuthorizedBusinessOffers } from '@/lib/services/owner-business-offer-service'
import type { OwnerOrganizationCampaignsResult } from '@/lib/services/owner-organization-campaign-service'
import { getOwnerAuthorizedOrganizationCampaigns } from '@/lib/services/owner-organization-campaign-service'
import type { OwnerCustomerActivityResult } from '@/lib/services/owner-customer-activity-service'
import { getOwnerAuthorizedCustomerActivity } from '@/lib/services/owner-customer-activity-service'
import { getOwnerWorkspacesResult } from '@/lib/services/workspace-service'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Support Center | RaiseHub Owner Console',
}

type SupportPageProps = {
  searchParams?: Promise<{
    workspaceId?: string
    workspaceRole?: string
    supportMode?: string
  }>
}

type ActorProfile = {
  role: string
}

const VALID_WORKSPACE_ROLES: WorkspaceRole[] = [
  'customer',
  'business',
  'organization',
]

function resolveWorkspaceRole(
  workspaceRole?: string
): WorkspaceRole | null {
  return VALID_WORKSPACE_ROLES.includes(
    workspaceRole as WorkspaceRole
  )
    ? (workspaceRole as WorkspaceRole)
    : null
}

function resolveWorkspaceMode(
  supportMode?: string
): WorkspaceSupportMode {
  return supportMode === 'read-only'
    ? 'read-only'
    : 'workspace'
}

function resolveSelectedWorkspace({
  workspaces,
  workspaceId,
  workspaceRole,
}: {
  workspaces: WorkspaceCardData[]
  workspaceId?: string
  workspaceRole?: string
}): WorkspaceCardData | null {
  if (!workspaceId) {
    return null
  }

  const validWorkspaceRole =
    resolveWorkspaceRole(workspaceRole)

  if (!validWorkspaceRole) {
    return null
  }

  return (
    workspaces.find(
      (workspace) =>
        workspace.id === workspaceId &&
        workspace.role === validWorkspaceRole
    ) ?? null
  )
}

export default async function OwnerSupportPage({
  searchParams,
}: SupportPageProps) {
  const params = searchParams
    ? await searchParams
    : {}

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<ActorProfile>()

  if (!profile || profile.role !== 'owner') {
    redirect('/dashboard')
  }

  const workspaceResult =
    await getOwnerWorkspacesResult()

  const selectedWorkspace =
    resolveSelectedWorkspace({
      workspaces: workspaceResult.workspaces,
      workspaceId: params.workspaceId,
      workspaceRole: params.workspaceRole,
    })

  const workspaceMode = selectedWorkspace
    ? resolveWorkspaceMode(params.supportMode)
    : 'workspace'

  let businessOffersResult: OwnerBusinessOffersResult | null =
    null

  if (
    selectedWorkspace?.role === 'business' &&
    workspaceMode === 'read-only'
  ) {
    businessOffersResult =
      await getOwnerAuthorizedBusinessOffers(
        selectedWorkspace.id,
        selectedWorkspace.role
      )
  }

  let organizationCampaignsResult: OwnerOrganizationCampaignsResult | null =
    null

  if (
    selectedWorkspace?.role === 'organization' &&
    workspaceMode === 'read-only'
  ) {
    organizationCampaignsResult =
      await getOwnerAuthorizedOrganizationCampaigns(
        selectedWorkspace.id,
        selectedWorkspace.role
      )
  }

  let customerActivityResult: OwnerCustomerActivityResult | null =
    null

  if (
    selectedWorkspace?.role === 'customer' &&
    workspaceMode === 'read-only'
  ) {
    customerActivityResult =
      await getOwnerAuthorizedCustomerActivity(
        selectedWorkspace.id,
        selectedWorkspace.role
      )
  }

  const businessCount =
    workspaceResult.workspaces.filter(
      (workspace) => workspace.role === 'business'
    ).length

  const organizationCount =
    workspaceResult.workspaces.filter(
      (workspace) =>
        workspace.role === 'organization'
    ).length

  const customerCount =
    workspaceResult.workspaces.filter(
      (workspace) => workspace.role === 'customer'
    ).length

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-900"
          >
            <span aria-hidden="true">←</span>
            Owner dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Client Assistance
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
                Support Center
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Find any customer, business, or organization, review its setup context, and enter read-only Support Mode without changing your permanent Owner identity.
              </p>
            </div>

            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              Owner only
            </span>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              All workspaces
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {workspaceResult.workspaces.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Businesses
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {businessCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Organizations
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {organizationCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Customers
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {customerCount}
            </p>
          </div>
        </section>

        {workspaceResult.error ? (
          <section className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5">
            <p className="font-bold text-rose-950">
              Workspaces could not be loaded
            </p>
            <p className="mt-2 text-sm leading-6 text-rose-800">
              {workspaceResult.error}
            </p>
          </section>
        ) : null}

        {selectedWorkspace ? (
          <section className="mt-6 space-y-5">
            <SelectedWorkspacePanel
              workspace={selectedWorkspace}
              mode={workspaceMode}
            />

            {workspaceMode === 'read-only' ? (
              <ReadOnlyWorkspaceView
                workspace={selectedWorkspace}
                businessOffersResult={businessOffersResult}
                organizationCampaignsResult={
                  organizationCampaignsResult
                }
                customerActivityResult={customerActivityResult}
              />
            ) : (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
                <p className="font-bold text-blue-950">
                  Workspace selected
                </p>
                <p className="mt-2 text-sm leading-6 text-blue-900">
                  Use Support Mode from the workspace card below to inspect account activity without entering the user experience.
                </p>
              </div>
            )}
          </section>
        ) : null}

        <section className="mt-6">
          <WorkspaceSelector
            workspaces={workspaceResult.workspaces}
          />
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Support boundary
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Inspect first, act deliberately
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Read-only Support Mode is the default safe path for account investigation. Future ticketing, internal notes, customer-visible replies, and audited support actions will extend this workspace without returning those tools to the main Owner dashboard.
          </p>
        </section>
      </div>
    </main>
  )
}
