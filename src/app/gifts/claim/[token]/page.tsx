import Link from 'next/link'

import ClaimGiftButton from './claim-gift-button'
import { hashGiftClaimToken } from '@/app/gifts/actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ token: string }>
}

type GiftPreview = {
  id: string
  recipient_name: string | null
  recipient_email: string | null
  personal_message: string | null
  status: string
  claim_expires_at: string | null
  claimed_by_user_id: string | null
  entitlement_id: string | null
  campaigns?: { name?: string | null } | null
}

function maskedEmail(value: string | null) {
  if (!value) return null
  const [local, domain] = value.split('@')
  if (!local || !domain) return value
  const first = local.slice(0, 1)
  return `${first}${'*'.repeat(Math.max(2, Math.min(6, local.length - 1)))}@${domain}`
}

export default async function GiftClaimPage({ params }: PageProps) {
  const { token } = await params
  const cleanToken = token.trim()
  const admin = createAdminClient() as any
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tokenHash = cleanToken ? hashGiftClaimToken(cleanToken) : ''
  let gift: GiftPreview | null = null

  if (tokenHash) {
    const { data } = await admin
      .from('gift_passes')
      .select('id, recipient_name, recipient_email, personal_message, status, claim_expires_at, claimed_by_user_id, entitlement_id, campaigns(name)')
      .eq('claim_token_hash', tokenHash)
      .maybeSingle()

    gift = data as GiftPreview | null
  }

  const expired = Boolean(
    gift?.claim_expires_at && new Date(gift.claim_expires_at).getTime() <= Date.now()
  )
  const unavailable =
    !gift ||
    expired ||
    ['cancelled', 'expired', 'refunded', 'pending_payment'].includes(gift.status)
  const alreadyClaimedByUser = Boolean(
    user && gift?.status === 'claimed' && gift.claimed_by_user_id === user.id
  )
  const claimedBySomeoneElse = Boolean(
    gift?.status === 'claimed' && (!user || gift.claimed_by_user_id !== user.id)
  )
  const nextPath = `/gifts/claim/${encodeURIComponent(cleanToken)}`
  const recipientHint = maskedEmail(gift?.recipient_email ?? null)

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-4 py-10 sm:px-6 sm:py-16">
      <section className="mx-auto max-w-2xl rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
          🎁 RaiseHub Gift Pass
        </p>

        {!gift ? (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">This gift link isn’t valid</h1>
            <p className="mt-3 text-slate-600">
              Ask the purchaser to check the private gift link and send it again.
            </p>
          </>
        ) : expired || gift.status === 'expired' ? (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">This gift link has expired</h1>
            <p className="mt-3 text-slate-600">
              The purchaser can contact RaiseHub support if they need help with this gift.
            </p>
          </>
        ) : gift.status === 'pending_payment' ? (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Gift payment is still confirming</h1>
            <p className="mt-3 text-slate-600">
              This gift cannot be claimed until its payment is confirmed.
            </p>
          </>
        ) : gift.status === 'cancelled' || gift.status === 'refunded' ? (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">This gift is no longer available</h1>
            <p className="mt-3 text-slate-600">
              The purchase was canceled or refunded, so no pass can be claimed from this link.
            </p>
          </>
        ) : claimedBySomeoneElse ? (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">This gift has already been claimed</h1>
            <p className="mt-3 text-slate-600">
              A private gift link can activate one recipient account only.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              {alreadyClaimedByUser
                ? 'Your gift pass is active'
                : `${gift.recipient_name ? `${gift.recipient_name}, y` : 'Y'}ou received six months of RaiseHub`}
            </h1>

            <p className="mt-3 text-slate-600">
              {gift.campaigns?.name
                ? `This gift supports ${gift.campaigns.name} and unlocks participating local offers for six months from the day you claim it.`
                : 'Claim this gift to unlock participating local offers for six months from today.'}
            </p>

            {gift.personal_message ? (
              <blockquote className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm italic text-emerald-950">
                “{gift.personal_message}”
              </blockquote>
            ) : null}

            {recipientHint ? (
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                This gift is protected for <strong>{recipientHint}</strong>. Sign in using that email address to claim it.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                This private link is the claim credential. It can activate one recipient account only.
              </div>
            )}

            <div className="mt-6">
              {alreadyClaimedByUser ? (
                <Link
                  href="/dashboard"
                  className="block w-full rounded-xl bg-emerald-700 px-5 py-3 text-center font-bold text-white hover:bg-emerald-800"
                >
                  Open My Pass
                </Link>
              ) : user ? (
                <ClaimGiftButton token={cleanToken} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href={`/login?next=${encodeURIComponent(nextPath)}`}
                    className="rounded-xl bg-emerald-700 px-5 py-3 text-center font-bold text-white hover:bg-emerald-800"
                  >
                    Log In to Claim
                  </Link>
                  <Link
                    href={`/signup?next=${encodeURIComponent(nextPath)}`}
                    className="rounded-xl border border-emerald-300 bg-white px-5 py-3 text-center font-bold text-emerald-800 hover:bg-emerald-50"
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

        {unavailable ? (
          <div className="mt-7">
            <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">
              Return to RaiseHub →
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  )
}
