import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/components/logout-button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-blue-600">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome, {user.email}</p>

        <div className="mt-4">
          <LogoutButton />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-yellow-500">Customer area</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will later show purchased fundraising passes.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-green-600">Business area</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will later show business offers and redemptions.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-blue-600">Organization area</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will later show fundraiser performance and earnings.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}