import Link from 'next/link'

import PolicyPageNav from '@/app/components/policy-page-nav'

const prohibitedCampaigns = [
  'Illegal activity, weapons, controlled substances, gambling, or financial schemes',
  'Fraudulent, misleading, impersonated, or unverifiable organizers or beneficiaries',
  'Hate, harassment, violence, exploitation, trafficking, or extremist activity',
  'Bail, bond, ransom, bribery, fines, penalties, or evasion of legal obligations',
  'Medical claims that cannot be reasonably documented when verification is requested',
  'Campaigns that promise investments, ownership, profit, interest, prizes, or guaranteed returns',
  'Fundraising that violates Stripe rules, card-network rules, sanctions, or applicable law',
]

export default function FundraisingPolicyPage() {
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
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              RaiseHub trust & safety
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Fundraising and Payout Policy
            </h1>
            <p className="mt-3 text-sm text-slate-300">Last updated July 23, 2026</p>
          </div>
        </header>

        <div className="mt-5">
          <PolicyPageNav active="fundraising" />
        </div>

        <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200 text-sm leading-7 text-slate-700">
          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Who may organize</h2>
            <p className="mt-2">
              Organization campaigns must be created by an authorized representative. Personal campaigns, when enabled, must be created by a verified adult who is the beneficiary or can explain and document their relationship to the beneficiary. RaiseHub may set lower limits or require enhanced review for new, personal, repeat, or higher-value campaigns.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Required verification</h2>
            <p className="mt-2">
              Organizers must complete Stripe-hosted identity, entity, tax, bank, and payout onboarding as required. RaiseHub may separately request public organization details, representative authorization, campaign-purpose evidence, invoices, estimates, affiliation records, or other documents reasonably necessary to review legitimacy and risk.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Draft and publication</h2>
            <p className="mt-2">
              Organizers may prepare drafts before verification is complete. A campaign may not publish or accept payments until required Stripe capabilities are enabled and RaiseHub has approved the campaign for publication. Approval may be withdrawn if information changes or new risk is discovered.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Prohibited campaigns</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {prohibitedCampaigns.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3">
              This list is not exhaustive. RaiseHub may reject activity that is unsafe, deceptive, high-risk, inconsistent with community fundraising, or not supported by its payment partners.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Fees and supporter disclosure</h2>
            <p className="mt-2">
              The total supporter charge must be shown before payment. Campaign pages and checkout should explain the pass price, any optional additional contribution, applicable platform fee, and the organizer&apos;s estimated proceeds. Personal-campaign payments are not represented as charitable or tax-deductible.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Transfer and payout timing</h2>
            <p className="mt-2">
              A successful supporter payment does not mean funds have reached the organizer&apos;s bank. RaiseHub may hold transfers while payments settle and while it reviews fraud, refunds, disputes, campaign completion, account changes, or compliance concerns. After funds are transferred to a Stripe connected account, bank arrival remains subject to Stripe&apos;s payout schedule and the recipient&apos;s financial institution.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Refunds, disputes, and reserves</h2>
            <p className="mt-2">
              RaiseHub may review refund requests and may issue, deny, or partially approve a refund based on the circumstances and applicable law. Transfers may be delayed, reduced, reversed, or offset to address refunds, chargebacks, payment disputes, suspected fraud, negative balances, fees, or processing obligations. Organizers must cooperate with evidence and response deadlines.
            </p>
            <Link
              href="/refund-policy"
              className="mt-3 inline-flex font-black text-blue-700"
            >
              Read the Refund Policy →
            </Link>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Changes and reporting</h2>
            <p className="mt-2">
              Organizers must promptly report material changes to the beneficiary, purpose, goal, representative, payout recipient, or use of funds. Users may report suspicious campaigns to RaiseHub. RaiseHub will maintain an internal review record and may preserve information needed for fraud, dispute, legal, or compliance review.
            </p>
          </section>
        </div>

        <footer className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-slate-500">
          <Link href="/terms" className="hover:text-blue-700">Terms</Link>
          <Link href="/support" className="hover:text-blue-700">Help & Contact</Link>
        </footer>
      </div>
    </main>
  )
}
