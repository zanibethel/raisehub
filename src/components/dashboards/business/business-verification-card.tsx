'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { applyBusinessVerificationAction } from './business-verification-actions'

type Props = {
  businessId: string | null
  status: string
  profileComplete: boolean
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function BusinessVerificationCard({ businessId, status, profileComplete }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const approved = status === 'approved'
  const pending = status === 'pending'
  const needsProfile = status === 'needs_profile' || !profileComplete

  function apply() {
    if (!businessId || isPending) return
    setMessage(null)
    startTransition(async () => {
      const result = await applyBusinessVerificationAction(businessId)
      if (!result.success) {
        setMessage(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Business verification</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            {approved ? 'Verified RaiseHub Partner' : 'Unlock eligible Partner Points'}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Verification determines whether production Partner Points count toward your quarter-end rewards pool share. Pending points stay recorded while your verification is incomplete or under review.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${approved ? 'bg-green-100 text-green-800' : pending ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
          {statusLabel(status)}
        </span>
      </div>

      {approved ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-800">
          Your qualifying Partner Points are eligible for the current rewards period. Verification approval also awards the +200 verification milestone.
        </div>
      ) : pending ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          Your application is in the Owner review queue. New production points remain pending until approval.
        </div>
      ) : needsProfile ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-amber-900">Complete your business name, phone, address, and logo before applying.</p>
          <a href="/dashboard/offers#business-profile" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white">
            Complete profile
          </a>
        </div>
      ) : (
        <button
          type="button"
          disabled={!businessId || isPending}
          onClick={apply}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? 'Submitting…' : status === 'declined' || status === 'revoked' ? 'Reapply for verification' : 'Apply for verification'}
        </button>
      )}

      {message ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{message}</p>
      ) : null}
    </section>
  )
}
