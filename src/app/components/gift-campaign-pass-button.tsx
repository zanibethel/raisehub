'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { purchaseGiftPassAction } from '@/app/gifts/actions'
import { createClient } from '@/lib/supabase/client'

type Props = {
  campaignId: string
  passPrice: number
  sellerName?: string
}

export default function GiftCampaignPassButton({
  campaignId,
  passPrice,
  sellerName = '',
}: Props) {
  const searchParams = useSearchParams()
  const sellerReferral = searchParams.get('seller')?.trim() || ''
  const [open, setOpen] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [donationAmount, setDonationAmount] = useState('0')
  const [deliveryMethod, setDeliveryMethod] = useState<'share_link' | 'printable'>('share_link')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [demoClaimPath, setDemoClaimPath] = useState('')

  const donation = Math.max(0, Number(donationAmount) || 0)
  const total = passPrice + donation

  async function handleGift() {
    if (loading) return

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const next = `/campaigns/${campaignId}${sellerReferral ? `?seller=${encodeURIComponent(sellerReferral)}` : ''}`
      window.location.assign(`/login?next=${encodeURIComponent(next)}`)
      return
    }

    setLoading(true)
    setMessage('')
    setDemoClaimPath('')

    const result = await purchaseGiftPassAction({
      campaignId,
      recipientName: recipientName || undefined,
      recipientEmail: recipientEmail || undefined,
      personalMessage: personalMessage || undefined,
      deliveryMethod,
      donationAmount: donation,
      sellerName: sellerName || undefined,
      sellerReferral: sellerReferral || undefined,
    })

    if (result.status === 'checkout-ready') {
      window.location.assign(result.url)
      return
    }

    if (result.status === 'demo-complete') {
      setDemoClaimPath(result.claimPath)
      setMessage(result.message)
      setLoading(false)
      return
    }

    setMessage(result.message)
    setLoading(false)
  }

  async function copyDemoLink() {
    if (!demoClaimPath) return
    const url = `${window.location.origin}${demoClaimPath}`
    await navigator.clipboard.writeText(url)
    setMessage('Gift link copied. Send it only to the intended recipient.')
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-100"
        aria-expanded={open}
      >
        🎁 Gift a RaiseHub Pass
      </button>

      {open ? (
        <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900">Give six months of local savings</h3>
              <p className="mt-1 text-sm text-slate-600">
                The recipient’s six-month access starts when they claim the gift—not when you buy it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              aria-label="Close gift form"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Recipient name</span>
              <input
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                maxLength={120}
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
                placeholder="Who is it for?"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Recipient email (optional)</span>
              <input
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                type="email"
                maxLength={320}
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
                placeholder="recipient@example.com"
              />
              <span className="mt-1 block text-xs text-slate-500">
                If entered, only an account using this email can claim the gift.
              </span>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">Personal message (optional)</span>
            <textarea
              value={personalMessage}
              onChange={(event) => setPersonalMessage(event.target.value)}
              maxLength={500}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
              placeholder="Enjoy this pass!"
            />
          </label>

          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700">How will you give it?</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDeliveryMethod('share_link')}
                className={`rounded-xl border p-3 text-left text-sm ${deliveryMethod === 'share_link' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300'}`}
              >
                <span className="font-semibold">Share private link</span>
                <span className="mt-1 block text-xs text-slate-600">Copy or share it after payment.</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMethod('printable')}
                className={`rounded-xl border p-3 text-left text-sm ${deliveryMethod === 'printable' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300'}`}
              >
                <span className="font-semibold">Printable gift</span>
                <span className="mt-1 block text-xs text-slate-600">Use the same private link on a card or printout.</span>
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-700" htmlFor="gift-donation">
              Optional fundraiser donation
            </label>
            <input
              id="gift-donation"
              type="number"
              min="0"
              step="1"
              value={donationAmount}
              onChange={(event) => setDonationAmount(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
            />
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex justify-between"><span>Gift pass</span><span>${passPrice.toFixed(2)}</span></div>
            {donation > 0 ? <div className="mt-1 flex justify-between"><span>Donation</span><span>${donation.toFixed(2)}</span></div> : null}
            <div className="mt-3 flex justify-between border-t border-blue-200 pt-3 font-bold"><span>Total today</span><span>${total.toFixed(2)}</span></div>
          </div>

          <button
            type="button"
            onClick={handleGift}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? 'Preparing gift…' : `Continue to Secure Checkout — $${total.toFixed(2)}`}
          </button>

          <p className="mt-2 text-center text-xs text-slate-500">
            Production gifts are paid through Stripe. The private claim link is shown after payment and should be shared only with the intended recipient.
          </p>

          {message ? (
            <div className={`mt-4 rounded-xl border p-3 text-sm ${demoClaimPath ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-700'}`}>
              <p>{message}</p>
              {demoClaimPath ? (
                <button
                  type="button"
                  onClick={copyDemoLink}
                  className="mt-3 rounded-lg bg-green-700 px-4 py-2 font-semibold text-white"
                >
                  Copy Demo Gift Link
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
