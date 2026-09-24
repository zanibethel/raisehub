import Link from 'next/link'

import PolicyPageNav from '@/app/components/policy-page-nav'

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/home"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Back to RaiseHub
        </Link>

        <header className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">
              RaiseHub policies
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Refund Policy
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              How pass purchases, donations, payment errors, and third-party offer issues are handled.
            </p>
          </div>
        </header>

        <div className="mt-5">
          <PolicyPageNav active="refund" />
        </div>

        <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200 text-sm leading-7 text-slate-700">
          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Fundraiser passes</h2>
            <p className="mt-2">
              RaiseHub fundraiser passes are digital products that support local organizations and unlock access to participating local offers.
            </p>
            <p className="mt-2">
              Because funds may support active fundraising campaigns, purchases are generally final once a pass has been issued.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Donations</h2>
            <p className="mt-2">
              Donations are generally non-refundable unless required by law or approved by RaiseHub due to a duplicate charge, technical issue, or clear payment error.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Business offer issues</h2>
            <p className="mt-2">
              If a business offer changes, expires, or cannot be fulfilled, RaiseHub may work with the participating business or organization to resolve the issue, but does not guarantee a refund for third-party business offer changes.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Requesting a review</h2>
            <p className="mt-2">
              Refund requests should include the purchaser email, campaign name, purchase date, and reason for the request.
            </p>
            <Link
              href="/support#contact"
              className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-4 text-sm font-black text-white"
            >
              Contact RaiseHub Support
            </Link>
          </section>
        </div>

        <footer className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-slate-500">
          <Link href="/terms" className="hover:text-blue-700">Terms</Link>
          <Link href="/fundraising-policy" className="hover:text-blue-700">
            Fundraising Policy
          </Link>
          <Link href="/support" className="hover:text-blue-700">Help & Contact</Link>
        </footer>
      </div>
    </main>
  )
}
