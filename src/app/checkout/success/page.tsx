import Link from 'next/link'

import GiftSharePanel from './gift-share-panel'
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
  purchase_kind: 'self' | 'gift'
  gift_pass_id: string | null
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
        'status, campaign_id, expected_amount_cents, donation_amount, grant_entitlement, purchase_id, purchase_kind, gift_pass_id'
      )
      .eq('stripe_checkout_session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()

    attempt = data as CheckoutAttempt | null
  }

  const paidAttempt =
    attempt?.status === 'paid' && attempt.purchase_id ? attempt : null
  const stillConfirming =
    attempt?.status === 'open' || attempt?.status === 'created'
  const campaignHref = attempt
    ? `/campaigns/${attempt.campaign_id}`
    : '/campaigns'
  const isGift = attempt?.purchase_kind === 'gift'

  const stateTone = paidAttempt
    ? 'text-green-300'
    : stillConfirming
      ? 'text-amber-300'
      : 'text-slate-300'

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
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-green-500/15 blur-3xl" />

          <div className="relative z-10">
            <p className={`text-xs font-black uppercase tracking-[0.18em] ${stateTone}`}>
              Secure checkout
            </p>

            {paidAttempt ? (
              <>
                <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-400/15 text-2xl font-black text-green-200">
                  ✓
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  {isGift ? 'Gift payment confirmed' : 'Payment confirmed'}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  {isGift
                    ? 'Your gift purchase and fundraiser support have been recorded. The recipient gets their own access when they claim the gift.'
                    : `Your ${paidAttempt.grant_entitlement ? 'RaiseHub Pass and fundraiser support' : 'fundraiser support'} were recorded successfully.`}
                </p>
              </>
            ) : stillConfirming ? (
              <>
                <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-xl font-black text-amber-200">
                  …
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Payment received — confirming {isGift ? 'your gift' : 'access'}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Stripe returned you successfully. RaiseHub is waiting for the signed payment confirmation before finalizing this {isGift ? 'gift' : 'purchase'}.
                </p>
              </>
            ) : (
              <>
                <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xl font-black text-slate-200">
                  ?
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  We could not confirm this checkout yet
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  No pass access or gift claim is created from this return page alone. Check your dashboard before trying another payment.
                </p>
              </>
            )}
          </div>
        </section>

        {paidAttempt ? (
          <section className="mt-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
              Purchase summary
            </p>
            <div className="mt-3 grid grid-cols-2 divide-x divide-slate-200 border-y border-slate-200 py-5 text-center">
              <div className="px-3">
                <p className="text-2xl font-black text-slate-950">
                  {currencyFromCents(paidAttempt.expected_amount_cents)}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Total paid
                </p>
              </div>
              <div className="px-3">
                <p className="text-2xl font-black text-green-700">
                  {paidAttempt.donation_amount > 0
                    ? currencyFromCents(
                        Math.round(paidAttempt.donation_amount * 100)
                      )
                    : '$0.00'}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Donation included
                </p>
              </div>
            </div>

            {isGift && paidAttempt.gift_pass_id ? (
              <div className="mt-5">
                <GiftSharePanel giftId={paidAttempt.gift_pass_id} />
              </div>
            ) : null}
          </section>
        ) : stillConfirming ? (
          <section className="mt-5 border-y border-amber-200 bg-amber-50 px-4 py-5">
            <p className="text-sm font-black text-amber-900">
              Confirmation is still processing
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              This usually completes quickly. Refresh this page in a moment before starting another checkout.
            </p>
          </section>
        ) : (
          <section className="mt-5 border-y border-blue-200 bg-blue-50 px-4 py-5">
            <p className="text-sm font-black text-blue-950">
              Avoid a duplicate purchase
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-900">
              Check your dashboard for new pass or gift activity first. If nothing appears, return to the fundraiser and try again.
            </p>
          </section>
        )}

        <section className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Next step
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link
              href={isGift ? '/dashboard/gifts' : '/dashboard'}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-blue-800"
            >
              {isGift ? 'Open My Gifts' : 'Check My Dashboard'}
            </Link>
            <Link
              href={campaignHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Return to Campaign
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
