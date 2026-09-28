import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'

import WebPortalSupportCheckout from './support-checkout'

export default function WebPortalSupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center text-sm font-black text-cyan-300 hover:text-cyan-200"
        >
          ← RaiseHub
        </Link>

        <section className="mt-4 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 p-5 shadow-2xl sm:p-8">
          <Image
            src="/webportal/brand/support-banner.jpg"
            alt="Support WebPortal"
            width={342}
            height={74}
            priority
            className="mx-auto mb-5 h-auto w-full max-w-[342px] rounded-xl"
          />
          <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/15 via-blue-500/10 to-transparent p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              Support WebPortal
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Help keep WebPortal improving
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
              WebPortal is built to make websites and video easier to use from a TV remote.
              If it has been useful to you, you can help cover hosting, testing, and continued development.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                Loading support options…
              </div>
            }
          >
            <WebPortalSupportCheckout />
          </Suspense>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-base font-black">What your support helps with</h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-300 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-900/70 p-4">Fire TV compatibility and remote-control improvements</div>
            <div className="rounded-xl bg-slate-900/70 p-4">Hosting, testing, releases, and update delivery</div>
            <div className="rounded-xl bg-slate-900/70 p-4">Video playback improvements and site compatibility</div>
            <div className="rounded-xl bg-slate-900/70 p-4">Keeping the core app lightweight and easy to use</div>
          </div>
        </section>

        <footer className="mt-6 text-center text-xs leading-5 text-slate-500">
          WebPortal support payments are optional. Questions? Visit RaiseHub for contact and support information.
        </footer>
      </div>
    </main>
  )
}
