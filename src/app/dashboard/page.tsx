import { redirect } from 'next/navigation'

import AccountMenu from '@/app/components/account-menu'
import AdminDashboard from '@/components/dashboards/admin/admin-dashboard'
import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import CustomerDashboard from '@/components/dashboards/customer/customer-dashboard'
import OrganizationDashboard from '@/components/dashboards/organization/organization-dashboard'
import OwnerDashboard from '@/components/dashboards/owner/owner-dashboard'
import type { PreviewRole } from '@/components/dashboards/owner/owner-dashboard'
import {
  resolveWorkspaceSelection,
  type DashboardExperienceRole,
} from '@/lib/rules/workspace-selection-rules'
import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { createClient } from '@/lib/supabase/server'
import type {
  LegacyProfileRole,
  SelectableWorkspace,
} from '@/lib/types/identity-access'

// =============================================================================
// Types
// =============================================================================

type Profile = {
  id: string
  email: string | null
  role: LegacyProfileRole
}

type DashboardPageProps = {
  searchParams?: Promise<{
    previewRole?: string | string[]
    workspace?: string | string[]
  }>
}

type RoleTheme = {
  title: string
  badge: string
  badgeClass: string
  headingClass: string
  panelClass: string
  intro: string
}

// =============================================================================
// Preview-role helpers
// =============================================================================

const VALID_PREVIEW_ROLES: PreviewRole[] = [
  'customer',
  'business',
  'organization',
  'admin',
]

function getPreviewRole(
  value?: string | string[]
): PreviewRole {
  const candidate = Array.isArray(value)
    ? value[0]
    : value

  return VALID_PREVIEW_ROLES.includes(
    candidate as PreviewRole
  )
    ? (candidate as PreviewRole)
    : 'customer'
}

// =============================================================================
// Role presentation
// =============================================================================

function getRoleTheme(
  role: DashboardExperienceRole
): RoleTheme {
  switch (role) {
    case 'business':
      return {
        title: 'Business Dashboard',
        badge: 'Business',
        badgeClass:
          'border border-green-200 bg-green-50 text-green-700',
        headingClass: 'text-green-700',
        panelClass:
          'border border-green-100 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'Manage offers, track redemptions, and grow local visibility.',
      }

    case 'organization':
      return {
        title: 'Organization Dashboard',
        badge: 'Organization',
        badgeClass:
          'border border-blue-200 bg-blue-50 text-blue-700',
        headingClass: 'text-blue-700',
        panelClass:
          'border border-blue-100 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'Track fundraising progress, supporters, and business partners.',
      }

    case 'admin':
      return {
        title: 'Admin Dashboard',
        badge: 'Admin',
        badgeClass:
          'border border-gray-300 bg-gray-100 text-gray-800',
        headingClass: 'text-gray-800',
        panelClass:
          'border border-gray-200 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'Manage platform activity, users, and campaigns.',
      }

    case 'owner':
      return {
        title: 'RaiseHub Platform Console',
        badge: 'Owner',
        badgeClass:
          'border border-slate-700 bg-slate-950 text-blue-200',
        headingClass: 'text-slate-950',
        panelClass:
          'border border-slate-200 bg-white/95 shadow-xl backdrop-blur',
        intro:
          'Run the platform, test role experiences, and assist RaiseHub clients.',
      }

    case 'customer':
    default:
      return {
        title: 'Customer Dashboard',
        badge: 'Customer',
        badgeClass:
          'border border-yellow-200 bg-yellow-50 text-yellow-700',
        headingClass: 'text-yellow-600',
        panelClass:
          'border border-yellow-100 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'View your passes, savings, and favorite local businesses.',
      }
  }
}

// =============================================================================
// Dashboard selection
// =============================================================================

function WorkspaceUnavailable({
  workspace,
}: {
  workspace: SelectableWorkspace
}) {
  return (
    <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
        Workspace unavailable
      </p>

      <h2 className="mt-2 text-xl font-bold text-gray-900">
        {workspace.name} is not connected yet
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Your access is recognized, but this workspace does not yet
        have the legacy account connection required by the current
        dashboard. No unrelated account data was loaded.
      </p>
    </section>
  )
}

function renderDashboard(
  role: DashboardExperienceRole,
  previewRole: PreviewRole,
  selectedWorkspace: SelectableWorkspace | null
) {
  switch (role) {
    case 'owner':
      return (
        <OwnerDashboard
          searchParams={{
            previewRole,
          }}
        />
      )

    case 'business':
      if (
        selectedWorkspace &&
        selectedWorkspace.kind === 'business' &&
        !selectedWorkspace.legacyProfileId
      ) {
        return (
          <WorkspaceUnavailable
            workspace={selectedWorkspace}
          />
        )
      }

      return (
        <BusinessDashboard
          businessLegacyProfileId={
            selectedWorkspace?.kind === 'business'
              ? selectedWorkspace.legacyProfileId
              : null
          }
        />
      )

    case 'organization':
      if (
        selectedWorkspace &&
        (selectedWorkspace.kind === 'organization' ||
          selectedWorkspace.kind === 'fundraising') &&
        !selectedWorkspace.legacyProfileId
      ) {
        return (
          <WorkspaceUnavailable
            workspace={selectedWorkspace}
          />
        )
      }

      return (
        <OrganizationDashboard
          organizationLegacyProfileId={
            selectedWorkspace?.kind === 'organization' ||
            selectedWorkspace?.kind === 'fundraising'
              ? selectedWorkspace.legacyProfileId
              : null
          }
        />
      )

    case 'admin':
      return <AdminDashboard />

    case 'customer':
    default:
      return <CustomerDashboard />
  }
}

// =============================================================================
// Route
// =============================================================================

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedSearchParams = searchParams
    ? await searchParams
    : undefined

  const [{ data: profile }, authenticatedWorkspacesResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', user.id)
        .single<Profile>(),
      getAuthenticatedWorkspaces(),
    ])

  if (!authenticatedWorkspacesResult.success) {
    console.error(
      'Unable to load authenticated workspaces:',
      authenticatedWorkspacesResult.reason
    )
  }

  const availableWorkspaces =
    authenticatedWorkspacesResult.success
      ? authenticatedWorkspacesResult.workspaces
      : []

  const legacyRole =
    profile?.role ?? 'customer'

  const workspaceSelection =
    resolveWorkspaceSelection({
      requestedWorkspace:
        resolvedSearchParams?.workspace,
      workspaces: availableWorkspaces,
      legacyRole,
    })

  const selectedWorkspace =
    workspaceSelection.selectedWorkspace

  const experienceRole =
    workspaceSelection.experienceRole

  const previewRole = getPreviewRole(
    resolvedSearchParams?.previewRole
  )

  const theme = getRoleTheme(experienceRole)

  return (
    <main
      className="min-h-screen bg-[#F0F6FF] p-4 sm:p-8"
      data-available-workspace-count={
        availableWorkspaces.length
      }
      data-selected-workspace-key={
        selectedWorkspace?.key ?? ''
      }
    >
      <div
        className={`mx-auto ${
          experienceRole === 'owner'
            ? 'max-w-7xl'
            : 'max-w-5xl'
        }`}
      >
        <header
          className={`relative z-50 rounded-3xl p-6 sm:p-8 ${theme.panelClass}`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${theme.badgeClass}`}
              >
                {theme.badge}
              </div>

              <h1
                className={`mt-4 text-3xl font-bold ${theme.headingClass}`}
              >
                {selectedWorkspace?.name ??
                  theme.title}
              </h1>

              <p className="mt-2 text-gray-600">
                {selectedWorkspace?.subtitle ??
                  theme.intro}
              </p>
            </div>

            <div className="relative sm:pt-1">
              <AccountMenu
                email={
                  user.email ??
                  profile?.email ??
                  null
                }
                workspaces={availableWorkspaces}
                selectedWorkspaceKey={
                  workspaceSelection.selectedWorkspaceKey
                }
              />
            </div>
          </div>
        </header>

        <div className="relative z-0">
          {renderDashboard(
            experienceRole,
            previewRole,
            selectedWorkspace
          )}
        </div>
      </div>
    </main>
  )
}