import { redirect } from 'next/navigation'

import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import { createClient } from '@/lib/supabase/server'

export default async function BusinessOffersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-[#F0F6FF]">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <BusinessDashboard view="offers" />
      </div>
    </main>
  )
}
