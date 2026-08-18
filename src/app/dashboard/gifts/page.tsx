import Link from 'next/link'
import { redirect } from 'next/navigation'

import GiftLinkActions from './gift-link-actions'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type GiftRow = {
  id: string
  purchaser_user_id: string
  recipient_name: string | null
  recipient_email: string | null
  personal_message: string | null
  delivery_method: string
  status: string
  claim_expires_at: string | null
  claimed_by_user_id: string | null
  claimed_at: string | null
  created_at: string
  campaigns?: { name?: string | null } | null
}

function statusLabel(status: string) {
  if (status === 'pending_payment') return 'Payment pending'
  if (status === 'purchased' || status === 'delivered') return 'Ready to share'
  if (status === 'claimed') return 'Claimed'
  if (status === 'refunded') return 'Refunded'
  if (status === 'cancelled') return 'Canceled'
  if (status === 'expired') return 'Expired'
  return status
}

function statusClass(status: string) {
  if (status === 'claimed') return 'bg-green-100 text-green-800'
  if (status === 'purchased' || status === 'delivered') return 'bg-emerald-100 text-emerald-800'
  if (status === 'pending_payment') return 'bg-yellow-100 text-yellow-800'
  return 'bg-slate-100 text-slate-700'
}

export default async function MyGiftsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/dashboard/gifts')

  const { data, error } = await supabase
    .from('gift_passes')
    .select('id, purchaser_user_id, recipient_name, recipient_email, personal_message, delivery_method, status, claim_expires_at, claimed_by_user_id, claimed_at, created_at, campaigns(name)')
    .order('created_at', { ascending: false })

  const gifts = (data ?? []) as GiftRow[]
  const sent = gifts.filter((gift) => gift.purchaser_user_id === user.id)
  const received = gifts.filter(
    (gift) => gift.claimed_by_user_id === user.id && gift.purchaser_user_id !== user.id
  )

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Gift a Pass</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">My Gifts</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track gifts you purchased, regenerate a private unclaimed link when needed, and see gifts already claimed on your account.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-center text-sm font-bold text-blue-700"
          >
            ← Dashboard
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Gift history is temporarily unavailable. Please try again.
          </div>
        ) : null}

        <section className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">Gifts I Sent</h2>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-600 shadow-sm">{sent.length}</span>
          </div>

          {sent.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              You haven’t purchased a gift pass yet. Open an active fundraiser and choose <strong>Gift a RaiseHub Pass</strong>.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {sent.map((gift) => {
                const shareable = ['purchased', 'delivered'].includes(gift.status)
                return (
                  <article key={gift.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{gift.campaigns?.name || 'RaiseHub fundraiser'}</p>
                        <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{gift.recipient_name || gift.recipient_email || 'Gift recipient'}</h3>
                        {gift.recipient_email ? <p className="mt-1 truncate text-sm text-slate-500">{gift.recipient_email}</p> : null}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(gift.status)}`}>
                        {statusLabel(gift.status)}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-500">Purchased</dt>
                        <dd className="mt-1 font-medium text-slate-800">{new Date(gift.created_at).toLocaleDateString()}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-500">Claim window</dt>
                        <dd className="mt-1 font-medium text-slate-800">{gift.claim_expires_at ? `Until ${new Date(gift.claim_expires_at).toLocaleDateString()}` : 'Not set'}</dd>
                      </div>
                      {gift.claimed_at ? (
                        <div className="sm:col-span-2">
                          <dt className="text-xs font-semibold uppercase text-slate-500">Claimed</dt>
                          <dd className="mt-1 font-medium text-slate-800">{new Date(gift.claimed_at).toLocaleString()}</dd>
                        </div>
                      ) : null}
                    </dl>

                    {gift.personal_message ? (
                      <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm italic text-emerald-900">“{gift.personal_message}”</p>
                    ) : null}

                    <div className="mt-auto pt-4">
                      {shareable ? (
                        <GiftLinkActions giftId={gift.id} />
                      ) : gift.status === 'claimed' ? (
                        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">This gift has been claimed. Its private link can no longer be regenerated.</p>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">Gifts I Received</h2>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-600 shadow-sm">{received.length}</span>
          </div>

          {received.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              Claimed gifts will appear here after they’re added to your account.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {received.map((gift) => (
                <article key={gift.id} className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700">{gift.campaigns?.name || 'RaiseHub fundraiser'}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">Gift Pass</h3>
                  <p className="mt-2 text-sm text-slate-600">Claimed {gift.claimed_at ? new Date(gift.claimed_at).toLocaleDateString() : 'on your account'}.</p>
                  <Link href="/dashboard" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Open My Pass</Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
