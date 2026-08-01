'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function BusinessSignupQrPage() {
  const [signupUrl, setSignupUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const url = `${window.location.origin}/workspace/new/business`
    setSignupUrl(url)

    QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 720,
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [])

  async function copyLink() {
    if (!signupUrl) return
    await navigator.clipboard.writeText(signupUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-xl rounded-3xl border border-green-200 bg-white p-5 text-center shadow-xl sm:p-8">
        <div className="flex items-center justify-between gap-3 text-left">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700">RaiseHub Partners</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Business signup</h1>
          </div>
          <Link href="/dashboard" className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
            Close
          </Link>
        </div>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600">
          Ask the business owner to scan this code to create a RaiseHub account and add their business workspace.
        </p>

        <div className="mx-auto mt-6 flex aspect-square w-full max-w-[22rem] items-center justify-center rounded-3xl border border-slate-200 bg-white p-4 shadow-inner">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt={`QR code for ${signupUrl}`} className="h-full w-full object-contain" />
          ) : (
            <p className="text-sm font-semibold text-slate-500">Preparing signup code…</p>
          )}
        </div>

        <p className="mt-5 break-all rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          {signupUrl || 'Loading signup link…'}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={copyLink}
            disabled={!signupUrl}
            className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {copied ? 'Link copied' : 'Copy signup link'}
          </button>
          <Link
            href="/workspace/new/business"
            className="rounded-xl border border-green-300 bg-green-50 px-5 py-3 font-bold text-green-800 transition hover:bg-green-100"
          >
            Open signup
          </Link>
        </div>
      </section>
    </main>
  )
}
