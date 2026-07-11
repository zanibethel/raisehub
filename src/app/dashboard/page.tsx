import { redirect } from 'next/navigation'

import LogoutButton from '@/app/components/logout-button'
import AdminDashboard from '@/components/dashboards/admin/admin-dashboard'
import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import CustomerDashboard from '@/components/dashboards/customer/customer-dashboard'
import OrganizationDashboard from '@/components/dashboards/organization/organization-dashboard'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

type Role = 'customer' | 'business' | 'organization' | 'admin'

type Profile = {
  id: string
  email: string | null
  role: Role
}

// =============================================================================
// Role presentation
// =============================================================================

function getRoleTheme(role: Role) {
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
// Role dashboard selection
// =============================================================================

function renderDashboard(role: Role) {
  switch (role) {
    case 'business':
      return <BusinessDashboard />

    case 'organization':
      return <OrganizationDashboard />

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

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single<Profile>()

  const role: Role = profile?.role ?? 'customer'
  const theme = getRoleTheme(role)

  return (
    <main className="min-h-screen bg-[#F0F6FF] p-8">
      <div className="mx-auto max-w-5xl">
        <header className={`rounded-3xl p-8 ${theme.panelClass}`}>
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
                {theme.title}
              </h1>

              <p className="mt-2 text-gray-600">
                {theme.intro}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Signed in as {user.email}
              </p>
            </div>

            <div className="sm:pt-1">
              <LogoutButton />
            </div>
          </div>
        </header>

        {renderDashboard(role)}
      </div>
    </main>
  )
}