'use client'

import { useMemo, useState, useTransition } from 'react'
import { createBusinessReferralAction } from './actions'

type Referral = {
  id: string
  referred_business_name: string | null
  attributed_email: string | null
  status: string
  referral_token: string
  referral_points_awarded: number | string
  created_at?: string | null
}

export default function ReferralClient({ businessId, referrals }: { businessId: string; referrals: Referral[] }) {
  const [email, setEmail] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const totals = useMemo(() => ({
    sent: referrals.length,
    verified: referrals.filter((r) => r.status === 'verified' || r.status === 'rewarded').length,
    pending: referrals.filter((r) => r.status === 'pending_verification').length,
    points: referrals.reduce((sum, r) => sum + Number(r.referral_points_awarded || 0), 0),
  }), [referrals])

  function createReferral() {
    if (pending) return
    setMessage(null)
    startTransition(async () => {
      const form = new FormData()
      form.set('businessId', businessId)
      if (email.trim()) form.set('email', email.trim())
      const result = await createBusinessReferralAction(form)
      if (!result.success || !result.token) {
        setMessage(result.error || 'Could not create referral.')
        return
      }
      const url = `${window.location.origin}/signup/business?ref=${encodeURIComponent(result.token)}`
      setLink(url)
      setEmail('')
      setMessage('Referral link created. Share it with the business you are inviting.')
    })
  }

  async function copyLink(value: string) {
    await navigator.clipboard.writeText(value)
    setMessage('Referral link copied.')
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-green-50 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-amber-700">Growth reward</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Refer a Verified Business</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Earn up to <strong>+500 Partner Points</strong> when a net-new business joins through your link, completes its profile, and becomes verified.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Stat label="Referrals" value={totals.sent} />
          <Stat label="Pending verification" value={totals.pending} />
          <Stat label="Verified" value={totals.verified} />
          <Stat label="Referral points" value={totals.points} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Create a referral link</h2>
        <p className="mt-1 text-sm text-slate-600">Email is optional. Attribution is locked to the business that signs up through the unique link.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Business email (optional)" className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4" />
          <button type="button" onClick={createReferral} disabled={pending} className="min-h-11 rounded-xl bg-green-600 px-5 font-black text-white disabled:bg-slate-300">{pending ? 'Creating…' : 'Create referral link'}</button>
        </div>
        {link ? (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
            <p className="break-all text-sm font-bold text-green-900">{link}</p>
            <button type="button" onClick={() => copyLink(link)} className="mt-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Copy link</button>
          </div>
        ) : null}
        {message ? <p className="mt-3 text-sm font-bold text-slate-700">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Referral report</h2>
        <p className="mt-1 text-sm text-slate-600">+50 signup · +150 completed profile · +300 verified = +500 maximum initial value.</p>
        <div className="mt-4 space-y-3">
          {referrals.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No business referrals yet.</p> : referrals.map((referral) => {
            const referralLink = `/signup/business?ref=${referral.referral_token}`
            return (
              <article key={referral.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{referral.referred_business_name || referral.attributed_email || 'Invited business'}</p>
                    <p className="mt-1 text-sm text-slate-500">{referral.status.replaceAll('_', ' ')}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">+{Number(referral.referral_points_awarded || 0)} pts</span>
                </div>
                <button type="button" onClick={() => copyLink(`${window.location.origin}${referralLink}`)} className="mt-3 text-sm font-black text-blue-700">Copy referral link</button>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>
}
