import Link from 'next/link'
import { Suspense } from 'react'

import WebPortalAdvertiseCheckout from './advertise-checkout'

export default function WebPortalAdvertisePage() {
  return (
    <main className="min-h-screen bg-[#F7FAFC] px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← RaiseHub
        </Link>

        <section className="mt-4 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
          <div className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              Advertise on WebPortal
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Put your business on the TV
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
              Your business can appear in WebPortal&apos;s lightweight rotating banner with a short message and a QR code people can scan from their phone.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-blue-50 p-3">
              <p className="text-xl font-black text-blue-700">$10</p>
              <p className="mt-1 text-xs font-bold text-slate-600">7 days</p>
            </div>
            <div className="rounded-2xl bg-green-50 p-3">
              <p className="text-xl font-black text-green-700">$25</p>
              <p className="mt-1 text-xs font-bold text-slate-600">30 days</p>
            </div>
            <div className="rounded-2xl bg-cyan-50 p-3">
              <p className="text-xl font-black text-cyan-700">$25/mo</p>
              <p className="mt-1 text-xs font-bold text-slate-600">Recurring</p>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                Loading advertising options…
              </div>
            }
          >
            <WebPortalAdvertiseCheckout />
          </Suspense>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            What happens next?
          </p>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <li><strong>1.</strong> Choose a placement and submit your business details.</li>
            <li><strong>2.</strong> Complete payment securely through Stripe.</li>
            <li><strong>3.</strong> We review the ad and destination for basic quality and safety.</li>
            <li><strong>4.</strong> Once approved, your paid 7-day or 30-day placement begins.</li>
          </ol>
        </section>

        <footer className="mt-6 flex flex-wrap justify-center gap-4 text-xs font-bold text-slate-500">
          <Link href="/terms" className="hover:text-blue-700">Terms</Link>
          <Link href="/privacy" className="hover:text-blue-700">Privacy</Link>
          <Link href="/support" className="hover:text-blue-700">Help</Link>
        </footer>
      </div>
    </main>
  )
}
