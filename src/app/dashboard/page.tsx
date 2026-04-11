import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/components/logout-button'

type Profile = {
  id: string
  email: string | null
  role: 'customer' | 'business' | 'organization' | 'admin'
}

function CustomerDashboard() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-yellow-600">My passes</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your purchased fundraiser passes will appear here.
        </p>
      </div>

      <div className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-yellow-600">Savings</h2>
        <p className="mt-2 text-sm text-gray-600">
          Track how much you have saved across local offers.
        </p>
      </div>

      <div className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-yellow-600">Favorites</h2>
        <p className="mt-2 text-sm text-gray-600">
          Save your favorite participating businesses here.
        </p>
      </div>
    </div>
  )
}

function BusinessDashboard() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-green-700">My offers</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your active fundraiser offers will appear here.
        </p>
      </div>

      <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-green-700">Redemptions</h2>
        <p className="mt-2 text-sm text-gray-600">
          Track offer redemptions and customer activity.
        </p>
      </div>

      <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-green-700">Marketing tools</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your AI marketing tools will live here.
        </p>
      </div>
    </div>
  )
}

function OrganizationDashboard() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-blue-700">Fundraiser totals</h2>
        <p className="mt-2 text-sm text-gray-600">
          See how much your campaign has raised.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-blue-700">Supporters</h2>
        <p className="mt-2 text-sm text-gray-600">
          View pass purchases and supporter participation.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-blue-700">Business partners</h2>
        <p className="mt-2 text-sm text-gray-600">
          Manage participating local businesses here.
        </p>
      </div>
    </div>
  )
}

function AdminDashboard() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-gray-800">Users</h2>
        <p className="mt-2 text-sm text-gray-600">
          Manage users, businesses, and organizations.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-gray-800">Campaigns</h2>
        <p className="mt-2 text-sm text-gray-600">
          Review active fundraiser campaigns.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-gray-800">Platform settings</h2>
        <p className="mt-2 text-sm text-gray-600">
          Configure platform-wide behavior here.
        </p>
      </div>
    </div>
  )
}

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

  const role = profile?.role ?? 'customer'

  return (
    <main className="min-h-screen bg-[#F0F6FF] p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome, {user.email}</p>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Role: {role}
            </p>
          </div>

          <LogoutButton />
        </div>

        {role === 'customer' && <CustomerDashboard />}
        {role === 'business' && <BusinessDashboard />}
        {role === 'organization' && <OrganizationDashboard />}
        {role === 'admin' && <AdminDashboard />}
      </div>
    </main>
  )
}