import Link from 'next/link'

import GiftSharePanel from './gift-share-panel'
import { hashGiftClaimToken } from '@/lib/gifts/claim-token'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ session_id?: string; gift?: string }>
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
  const { session_id: sessionId, gift: giftToken } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let attempt: CheckoutAttempt | null = null
  let giftTokenMatchesAttempt = false

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

    if (
      attempt?.purchase_kind === 'gift' &&
      attempt.gift_pass_id &&
      giftToken
    ) {
      const { data: gift } = await admin
        .from('gift_passes')
        .select('id')
        .eq('id', attempt.gift_pass_id)
        .eq('claim_token_hash', hashGiftClaimToken(giftToken))
        .maybeSingle()

      giftTokenMatchesAttempt = Boolean(gift)
    }
  }

  const paidAttempt =
    attempt?.status === 'paid' && attempt.purchase_id ? attempt : null
  const stillConfirming =
    attempt?.status === 'open' || attempt?.status === 'created'
  const campaignHref = attempt
    ? `/campaigns/${attempt.campaign_id}`
    : '/campaigns'
  const isGift = attempt?.purchase_kind === 'gift'
  const claimPath =
    isGift && giftTokenMatchesAttempt && giftToken
      ? `/gifts/claim/${encodeURIComponent(giftToken)}`
      : null

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Secure checkout
        </p>

        {paidAttempt ? (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              {isGift ? 'Gift payment confirmed 🎁' : 'Payment confirmed'}
            </h1>
            <p className="mt-3 text-slate-600">
              {isGift
                ? 'Your gift purchase and fundraiser support have been recorded. No pass was added to your account—the recipient receives their own access when they claim the gift.'
                : `Your ${paidAttempt.grant_entitlement ? 'RaiseHub Pass and support' : 'support'} have been recorded successfully.`}
            </p>
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
              <p className="font-semibold">
                Total paid:{' '}
                {currencyFromCents(paidAttempt.expected_amount_cents)}
              </p>
              {paidAttempt.donation_amount > 0 ? (
                <p className="mt-1 text-sm">
                  Donation included:{' '}
                  {currencyFromCents(
                    Math.round(paidAttempt.donation_amount * 100)
                  )}
                </p>
              ) : null}
            </div>

            {isGift ? (
              claimPath ? (
                <GiftSharePanel claimPath={claimPath} />
              ) : (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Payment is confirmed, but this return page no longer has the private claim token. Your gift record is safe; open My Gifts to generate a fresh private link before sending it.
                </div>
              )
            ) : null}
          </>
        ) : stillConfirming ? (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Payment received — confirming {isGift ? 'your gift' : 'access'}
            </h1>
            <p className="mt-3 text-slate-600">
              Stripe returned you successfully. RaiseHub is waiting for the
              signed payment confirmation before finalizing this {isGift ? 'gift' : 'purchase'}.
            </p>
            <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              This usually completes quickly. Refresh this page in a moment.
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              We could not confirm this checkout yet
            </h1>
            <p className="mt-3 text-slate-600">
              No pass access or gift claim is created from this return page alone. Check your dashboard before trying another payment.
            </p>
          </>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href={isGift ? '/dashboard/gifts' : '/dashboard'}
            className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700"
          >
            {isGift ? 'Open My Gifts' : 'Check My Dashboard'}
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
