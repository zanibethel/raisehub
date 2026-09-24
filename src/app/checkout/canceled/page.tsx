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
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href={campaignHref}
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Back to fundraiser
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl" />

          <div className="relative z-10">
            <p className={`text-xs font-black uppercase tracking-[0.18em] ${
              wasAlreadyPaid ? 'text-green-300' : 'text-amber-300'
            }`}>
              Secure checkout
            </p>
            <div className={`mt-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black ${
              wasAlreadyPaid
                ? 'bg-green-400/15 text-green-200'
                : 'bg-amber-400/15 text-amber-200'
            }`}>
              {wasAlreadyPaid ? '✓' : '×'}
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {wasAlreadyPaid ? 'Payment was already confirmed' : 'Checkout canceled'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {wasAlreadyPaid
                ? 'Your completed purchase is available in your dashboard.'
                : 'You were not charged by this canceled checkout, and RaiseHub did not grant new pass access from this return page.'}
            </p>
          </div>
        </section>

        <section className="mt-5 border-y border-slate-200 py-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            {wasAlreadyPaid ? 'Purchase status' : 'Nothing was submitted'}
          </p>
          <h2 className="mt-2 text-xl font-black">
            {wasAlreadyPaid
              ? 'Your payment is safe'
              : 'You can return without starting over'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {wasAlreadyPaid
              ? 'The completed transaction is already recorded. You do not need to pay again.'
              : 'Your campaign and donation selections were not submitted as a completed purchase. Return to the fundraiser whenever you are ready.'}
          </p>
        </section>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href={campaignHref}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-blue-800"
          >
            Return to Campaign
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Check My Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
