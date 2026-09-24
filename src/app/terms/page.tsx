import Link from 'next/link'

import PolicyPageNav from '@/app/components/policy-page-nav'

export default function TermsPage() {
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
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              RaiseHub policies
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Terms of Use
            </h1>
            <p className="mt-3 text-sm text-slate-300">Last updated July 23, 2026</p>
          </div>
        </header>

        <div className="mt-5">
          <PolicyPageNav active="terms" />
        </div>

        <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200 text-sm leading-7 text-slate-700">
          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">About RaiseHub</h2>
            <p className="mt-2">
              RaiseHub is a community fundraising platform that helps eligible campaign organizers raise support through digital passes connected to participating local-business offers. RaiseHub is not a charity, bank, tax adviser, legal adviser, school, or nonprofit organization.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Organizer responsibilities</h2>
            <p className="mt-2">
              Campaign organizers must provide truthful, complete, and current information; have authority to act for the named organization or beneficiary; use proceeds substantially for the stated purpose; and promptly respond to verification or documentation requests.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Campaign review and suspension</h2>
            <p className="mt-2">
              Creating a draft does not guarantee publication. RaiseHub may review, reject, pause, hide, archive, or remove a campaign or account when information cannot be verified, prohibited activity is suspected, Stripe requirements are incomplete, disputes arise, or continued activity may create risk for supporters, beneficiaries, businesses, RaiseHub, or its payment partners.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Payments, fees, and payouts</h2>
            <p className="mt-2">
              Supporters will see the amount charged before payment. Applicable platform fees and the organizer&apos;s estimated proceeds must be disclosed before a campaign accepts payments. Payout timing depends on completed identity and bank verification, payment settlement, fraud and dispute review, any disclosed hold period, and Stripe&apos;s payout schedule.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Refunds and disputes</h2>
            <p className="mt-2">
              Refund requests are reviewed based on the payment status, campaign circumstances, pass access already provided, organizer conduct, and applicable law. RaiseHub may reverse or withhold transfers to cover refunds, chargebacks, disputes, suspected fraud, negative balances, or payment-processing obligations.
            </p>
            <Link
              href="/refund-policy"
              className="mt-3 inline-flex font-black text-blue-700"
            >
              Read the Refund Policy →
            </Link>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Taxes and charitable claims</h2>
            <p className="mt-2">
              Personal-campaign contributions are not represented as tax-deductible. An organization may not claim that payments are tax-deductible unless it is legally qualified to make that representation and provides the required disclosures. Organizers and payout recipients are responsible for their own tax reporting and professional advice.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Business offers</h2>
            <p className="mt-2">
              Business offers are created and fulfilled by participating businesses. RaiseHub does not guarantee the availability, pricing, service quality, or fulfillment of a third-party offer. Users may not copy, resell, transfer, automate, or abuse offers, passes, accounts, campaigns, or fundraising tools.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Additional fundraising rules</h2>
            <p className="mt-2">
              The public Fundraising and Payout Policy is incorporated into these Terms and contains additional eligibility, prohibited-use, verification, refund, dispute, and transfer rules.
            </p>
            <Link
              href="/fundraising-policy"
              className="mt-3 inline-flex font-black text-blue-700"
            >
              Read the Fundraising and Payout Policy →
            </Link>
          </section>
        </div>

        <footer className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-slate-500">
          <Link href="/privacy" className="hover:text-blue-700">Privacy</Link>
          <Link href="/support" className="hover:text-blue-700">Help & Contact</Link>
        </footer>
      </div>
    </main>
  )
}
