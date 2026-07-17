import Link from 'next/link'
import { redirect } from 'next/navigation'

import AdminDashboard from '@/components/dashboards/admin/admin-dashboard'
import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import CustomerDashboard from '@/components/dashboards/customer/customer-dashboard'
import OrganizationDashboard from '@/components/dashboards/organization/organization-dashboard'
import OwnerRoleSwitcher, {
  type PreviewRole,
} from '@/components/dashboards/owner/owner-role-switcher'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Experience Viewer | RaiseHub Owner Console',
}

type PreviewPageProps = {
  searchParams?: Promise<{
    previewRole?: string | string[]
  }>
}

type ActorProfile = {
  role: string
}

const VALID_PREVIEW_ROLES: PreviewRole[] = [
  'customer',
  'business',
  'organization',
  'admin',
]

function resolvePreviewRole(
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

function getPreviewLabel(role: PreviewRole): string {
  switch (role) {
    case 'business':
      return 'Business experience'
    case 'organization':
      return 'Organization experience'
    case 'admin':
      return 'Admin experience'
    case 'customer':
    default:
      return 'Customer experience'
  }
}

function renderPreview(role: PreviewRole) {
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

export default async function OwnerPreviewPage({
  searchParams,
}: PreviewPageProps) {
  const params = searchParams
    ? await searchParams
    : undefined

  const activeRole = resolvePreviewRole(
    params?.previewRole
  )

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
                Demo Platform
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
                Experience Viewer
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Test each RaiseHub role experience from one Owner login without changing your permanent account role.
              </p>
            </div>

            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              Owner only
            </span>
          </div>
        </header>

        <section className="mt-6">
          <OwnerRoleSwitcher activeRole={activeRole} />
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-white sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
                  Live preview
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {getPreviewLabel(activeRole)}
                </h2>
              </div>

              <span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-200">
                Preview only
              </span>
            </div>
          </div>

          <div className="bg-[#F0F6FF] p-4 sm:p-6">
            {renderPreview(activeRole)}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
            Safety boundary
          </p>

          <h2 className="mt-2 text-xl font-bold text-amber-950">
            Preview does not change authorization
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
            This viewer changes only the rendered experience. Your saved role remains Owner, and production authorization still follows the real account and workspace access model.
          </p>
        </section>
      </div>
    </main>
  )
}
