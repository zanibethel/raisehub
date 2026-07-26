import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SellerOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/seller/onboarding')

  const displayName = String(user.user_metadata?.seller_display_name ?? user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Seller').trim() || 'Seller'
  const admin = createAdminClient()
  const sellerProfiles = admin.from('seller_profiles') as any

  const { data: existingProfile } = await sellerProfiles
    .select('id, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  let sellerProfile = existingProfile
  let setupError: string | null = null

  if (!sellerProfile) {
    const { data, error } = await sellerProfiles
      .insert({ user_id: user.id, display_name: displayName, status: 'active' })
      .select('id, display_name')
      .single()

    sellerProfile = data
    setupError = error?.message ?? null
  }

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-5 py-10 text-gray-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-blue-100 bg-white p-7 shadow-xl sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Seller setup</p>
          <h1 className="mt-3 text-3xl font-bold">{setupError ? 'Your seller profile needs attention' : `Welcome, ${sellerProfile?.display_name ?? displayName}`}</h1>
          <p className="mt-3 leading-7 text-gray-600">
            {setupError
              ? 'RaiseHub could not finish creating your seller profile. Your account is safe, but setup must be retried before you can claim a roster name.'
              : 'Your reusable seller profile is ready. Next, join an organization and connect your profile to the name already listed on its campaign roster.'}
          </p>

          {setupError ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{setupError}</div>
          ) : (
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="font-bold text-emerald-800">1. Join</p><p className="mt-1 text-sm text-gray-600">Use the organization’s invitation or join link.</p></div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="font-bold text-blue-800">2. Claim</p><p className="mt-1 text-sm text-gray-600">Choose your unclaimed roster name.</p></div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><p className="font-bold text-violet-800">3. Share</p><p className="mt-1 text-sm text-gray-600">Use the same link and QR already assigned to that name.</p></div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {!setupError ? (
              <Link href="/seller/claim-roster" className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700">Link my roster name</Link>
            ) : null}
            <Link href="/dashboard" className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50">Go to dashboard</Link>
          </div>

          <p className="mt-6 text-sm text-gray-500">No organization invitation yet? Ask the organizer for its seller join link. Your seller profile will remain ready until you join.</p>
        </section>
      </div>
    </main>
  )
}
