import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClaimRosterClient from './claim-roster-client'
import { listClaimableRosterEntriesAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function ClaimRosterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/seller/claim-roster')
  }

  const result = await listClaimableRosterEntriesAction()

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/dashboard" className="text-sm font-medium text-blue-700 hover:underline">
          ← Back to dashboard
        </Link>

        <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Seller profile</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Link yourself to a campaign roster</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Join an organization as a seller, choose its active campaign, then select your name from the unclaimed roster. Your existing seller link, QR code, and sales history stay unchanged.
          </p>

          <div className="mt-6">
            {!result.success ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
                {result.error}
              </div>
            ) : result.data.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <p className="font-semibold text-gray-900">No claimable roster names found</p>
                <p className="mt-2 text-sm text-gray-600">
                  Make sure you joined the organization as a seller and that the organizer added your name to an active campaign.
                </p>
              </div>
            ) : (
              <ClaimRosterClient entries={result.data} />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
