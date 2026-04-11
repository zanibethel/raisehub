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
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome, {user.email}</p>

      <div className="mt-4">
        <LogoutButton />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-5">
          <h2 className="font-semibold">Customer area</h2>
          <p className="mt-2 text-sm text-gray-600">
            This will later show purchased fundraising passes.
          </p>
        </div>

        <div className="rounded-2xl border p-5">
          <h2 className="font-semibold">Business area</h2>
          <p className="mt-2 text-sm text-gray-600">
            This will later show business offers and redemptions.
          </p>
        </div>

        <div className="rounded-2xl border p-5">
          <h2 className="font-semibold">Organization area</h2>
          <p className="mt-2 text-sm text-gray-600">
            This will later show fundraiser performance and earnings.
          </p>
        </div>
      </div>
    </main>
  )
}