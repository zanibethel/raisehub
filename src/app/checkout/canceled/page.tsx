import Link from 'next/link'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ attempt?: string; campaign?: string }>
}

type CheckoutAttempt = {
  id: string
  campaign_id: string
  status: string
  purchase_id: string | null
}

export default async function CheckoutCanceledPage({ searchParams }: PageProps) {
  const { attempt: attemptId, campaign: campaignIdParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let attempt: CheckoutAttempt | null = null

  if (user && attemptId) {
    const admin = createAdminClient() as any
    const { data } = await admin
      .from('checkout_attempts')
      .select('id, campaign_id, status, purchase_id')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .maybeSingle()

    attempt = data as CheckoutAttempt | null
  }

  const campaignId = attempt?.campaign_id ?? campaignIdParam ?? null
  const campaignHref = campaignId ? `/campaigns/${campaignId}` : '/campaigns'
  const wasAlreadyPaid = attempt?.status === 'paid' && Boolean(attempt.purchase_id)

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Secure checkout
        </p>

        {wasAlreadyPaid ? (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Payment was already confirmed
            </h1>
            <p className="mt-3 text-slate-600">
              Your completed purchase is available in your dashboard.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Checkout canceled
            </h1>
            <p className="mt-3 text-slate-600">
              You were not charged by this canceled checkout, and RaiseHub did not grant new pass access from this return page.
            </p>
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              Your campaign and donation selections were not submitted as a completed purchase. You can safely return and try again.
            </div>
          </>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href={campaignHref}
            className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700"
          >
            Return to Campaign
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
          >
            Check My Dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}
