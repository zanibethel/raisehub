'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { updateOfferAction } from '@/app/dashboard/actions'
import {
  getOfferUsageRuleLabel,
  isOfferUsageRule,
  type OfferUsageRule,
} from '@/lib/redemption-rules'

type Props = {
  offer: {
    id: string
    title: string | null
    discount: string | null
    description: string | null
    starts_at: string | null
    ends_at: string | null
    usage_rule: string | null
  }
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

export default function EditOfferForm({ offer }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const initialUsageRule: OfferUsageRule = isOfferUsageRule(offer.usage_rule)
    ? offer.usage_rule
    : 'one-time'

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)

        const formData = new FormData(event.currentTarget)
        const rawUsageRule = String(formData.get('usage_rule') ?? '')

        if (!isOfferUsageRule(rawUsageRule)) {
          setError('Choose a valid redemption frequency.')
          return
        }

        startTransition(async () => {
          const result = await updateOfferAction({
            offerId: offer.id,
            title: String(formData.get('title') ?? ''),
            discount: String(formData.get('discount') ?? ''),
            description: String(formData.get('description') ?? ''),
            starts_at: String(formData.get('starts_at') ?? ''),
            ends_at: String(formData.get('ends_at') ?? ''),
            usage_rule: rawUsageRule,
          })

          if (result.error) {
            setError(result.error)
            return
          }

          router.push('/dashboard/offers')
          router.refresh()
        })
      }}
    >
      <label className="block">
        <span className="text-sm font-bold text-slate-800">Offer title</span>
        <input name="title" defaultValue={offer.title ?? ''} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-slate-800">Member benefit</span>
        <input name="discount" defaultValue={offer.discount ?? ''} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-slate-800">Description</span>
        <textarea name="description" defaultValue={offer.description ?? ''} required rows={5} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
      </label>

      <label className="block rounded-2xl border border-green-100 bg-green-50 p-4">
        <span className="text-sm font-bold text-green-900">Redemption frequency</span>
        <p className="mt-1 text-xs leading-5 text-green-800">
          Reusable offers become available to the member again automatically when the selected window opens.
        </p>
        <select
          name="usage_rule"
          defaultValue={initialUsageRule}
          className="mt-3 w-full rounded-xl border border-green-200 bg-white px-4 py-3 font-semibold text-slate-800"
        >
          <option value="one-time">{getOfferUsageRuleLabel('one-time')}</option>
          <option value="daily">{getOfferUsageRuleLabel('daily')}</option>
          <option value="weekly">{getOfferUsageRuleLabel('weekly')}</option>
          <option value="unlimited">{getOfferUsageRuleLabel('unlimited')}</option>
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-slate-800">Starts</span>
          <input type="date" name="starts_at" defaultValue={toDateInput(offer.starts_at)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-800">Ends</span>
          <input type="date" name="ends_at" defaultValue={toDateInput(offer.ends_at)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
        </label>
      </div>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => router.push('/dashboard/offers')} className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700">Cancel</button>
        <button type="submit" disabled={isPending} className="rounded-xl bg-green-700 px-4 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-70">
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
