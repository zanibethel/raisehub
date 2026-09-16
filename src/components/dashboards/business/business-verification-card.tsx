'use client'

import { useState } from 'react'

type Props = {
  businessId: string | null
  status: string
  profileComplete: boolean
  missingFields: string[]
}

function displayStatus(status: string, profileComplete: boolean) {
  if (status === 'approved') return 'Verified'
  if (status === 'pending') return 'Pending Verification'
  if (!profileComplete || ['not_applied', 'needs_profile', 'declined', 'revoked'].includes(status)) return 'Unverified'
  return 'Unverified'
}

export default function BusinessVerificationCard({ businessId, status, profileComplete, missingFields }: Props) {
  const [expanded, setExpanded] = useState(false)
  const approved = status === 'approved'
  const pending = status === 'pending'
  const label = displayStatus(status, profileComplete)

  return (
    <section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Business verification</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            {approved ? 'Verified RaiseHub Partner' : pending ? 'Verification is under review' : 'Complete your trust profile'}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Verification is the trust gate for public offers and eligible Partner Rewards. Once all required profile details are complete, RaiseHub automatically moves your business to Pending Verification for Owner review.
          </p>
          <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 text-sm font-black text-blue-700">
            {expanded ? 'Hide details' : 'Learn more'}
          </button>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${approved ? 'bg-green-100 text-green-800' : pending ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
          {label}
        </span>
      </div>

      {expanded ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Required before review</p>
            {missingFields.length === 0 ? (
              <p className="mt-2 text-sm font-bold text-green-700">✓ All required profile details are complete.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm font-bold text-amber-900">
                {missingFields.map((field) => <li key={field}>○ Add {field}</li>)}
              </ul>
            )}
            {!profileComplete ? (
              <a href="/dashboard/offers#business-profile" className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-slate-950 px-3 text-xs font-black text-white">Complete profile</a>
            ) : null}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">Optional ways to earn</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-950">
              <li><strong>+50</strong> Facebook link</li>
              <li><strong>+50</strong> Instagram link</li>
              <li><strong>+50</strong> TikTok link</li>
              <li><strong>+50</strong> website link</li>
              <li><strong>+500 total</strong> for a referred business that signs up, completes its profile, and becomes verified</li>
            </ul>
            <a href="/dashboard/rewards/referrals" className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-green-700 px-3 text-xs font-black text-white">Refer a business</a>
          </div>
        </div>
      ) : null}

      {approved ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-800">
          Your business can publish eligible offers and qualifying Partner Points count toward the current rewards period.
        </div>
      ) : pending ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          Your business is in the Owner review queue. You can keep building offers, but they remain private until verification is approved.
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
          {businessId ? 'Finish the required profile details above. Verification submission happens automatically when the checklist is complete.' : 'Finish setting up your business workspace to begin verification.'}
        </div>
      )}
    </section>
  )
}
