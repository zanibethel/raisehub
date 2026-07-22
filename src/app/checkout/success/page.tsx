import Link from 'next/link'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ session_id?: string }>
}

type CheckoutAttempt = {
  status: string
  campaign_id: string
  expected_amount_cents: number
  donation_amount: number
  grant_entitlement: boolean
  purchase_id: string | null
}

function currencyFromCents(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value / 100)
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { session_id: sessionId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let attempt: CheckoutAttempt | null = null

  if (user && sessionId) {
    const admin = createAdminClient() as any
    const { data } = await admin
      .from('checkout_attempts')
      .select(
        'status, campaign_id, expected_amount_cents, donation_amount, grant_entitlement, purchase_id'
      )
      .eq('stripe_checkout_session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()

    attempt = data as CheckoutAttempt | null
  }

  const paid = attempt?.status === 'paid' && Boolean(attempt.purchase_id)
  const stillConfirming = attempt?.status === 'open' || attempt?.status === 'created'
  const campaignHref = attempt ? `/campaigns/${attempt.campaign_id}` : '/campaigns'

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Secure checkout
        </p>

        {paid ? (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Payment confirmed
            </h1>
            <p className="mt-3 text-slate-600">
              Your {attempt?.grant_entitlement ? 'RaiseHub Pass and support' : 'support'} have been recorded successfully.
            </p>
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
              <p className="font-semibold">
                Total paid: {currencyFromCents(attempt.expected_amount_cents)}
              </p>
              {attempt.donation_amount > 0 ? (
                <p className="mt-1 text-sm">
                  Donation included: {currencyFromCents(Math.round(attempt.donation_amount * 100))}
                </p>
              ) : null}
            </div>
          </>
        ) : stillConfirming ? (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Payment received — confirming access
            </h1>
            <p className="mt-3 text-slate-600">
              Stripe returned you successfully. RaiseHub is waiting for the signed payment confirmation before adding pass access.
            </p>
            <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              This usually completes quickly. Refresh this page or check your dashboard in a moment.
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              We could not confirm this checkout yet
            </h1>
            <p className="mt-3 text-slate-600">
              No pass access is granted from this page. Check your dashboard before trying another payment.
            </p>
          </>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard"
            className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700"
          >
            Check My Dashboard
          </Link>
          <Link
            href={campaignHref}
            className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
          >
            Return to Campaign
          </Link>
        </div>
      </section>
    </main>
  )
}
