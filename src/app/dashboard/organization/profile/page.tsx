import Link from 'next/link'
import { redirect } from 'next/navigation'

import OrganizationProfileSetupLoader from '@/components/dashboards/organization/organization-profile-setup-loader'
import { createClient } from '@/lib/supabase/server'

export default async function OrganizationProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard/organization/profile')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-green-700">
            Organization settings
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950 sm:text-4xl">
            Edit organization profile
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            Keep your organization details accurate so supporters know who they
            are helping and your campaigns remain eligible to publish.
          </p>
        </div>

        <div className="mt-8">
          <OrganizationProfileSetupLoader />
        </div>
      </div>
    </main>
  )
}
