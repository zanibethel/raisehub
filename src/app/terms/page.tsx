import Link from 'next/link'

import PolicyReturnButton from '@/app/components/policy-return-button'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-gray-900">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6">
          <PolicyReturnButton />
        </div>

        <h1 className="text-3xl font-bold text-blue-700">Terms of Use</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated July 23, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="font-bold text-gray-900">About RaiseHub</h2>
            <p className="mt-2">
              RaiseHub is a community fundraising platform that helps eligible
              campaign organizers raise support through digital passes connected to
              participating local-business offers. RaiseHub is not a charity, bank,
              tax adviser, legal adviser, school, or nonprofit organization.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">Organizer responsibilities</h2>
            <p className="mt-2">
              Campaign organizers must provide truthful, complete, and current
              information; have authority to act for the named organization or
              beneficiary; use proceeds substantially for the stated purpose; and
              promptly respond to verification or documentation requests.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">Campaign review and suspension</h2>
            <p className="mt-2">
              Creating a draft does not guarantee publication. RaiseHub may review,
              reject, pause, hide, archive, or remove a campaign or account when
              information cannot be verified, prohibited activity is suspected,
              Stripe requirements are incomplete, disputes arise, or continued
              activity may create risk for supporters, beneficiaries, businesses,
              RaiseHub, or its payment partners.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">Payments, fees, and payouts</h2>
            <p className="mt-2">
              Supporters will see the amount charged before payment. Applicable
              platform fees and the organizer's estimated proceeds must be disclosed
              before a campaign accepts payments. Payout timing depends on completed
              identity and bank verification, payment settlement, fraud and dispute
              review, any disclosed hold period, and Stripe's payout schedule.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">Refunds and disputes</h2>
            <p className="mt-2">
              Refund requests are reviewed based on the payment status, campaign
              circumstances, pass access already provided, organizer conduct, and
              applicable law. RaiseHub may reverse or withhold transfers to cover
              refunds, chargebacks, disputes, suspected fraud, negative balances, or
              payment-processing obligations.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">Taxes and charitable claims</h2>
            <p className="mt-2">
              Personal-campaign contributions are not represented as tax-deductible.
              An organization may not claim that payments are tax-deductible unless
              it is legally qualified to make that representation and provides the
              required disclosures. Organizers and payout recipients are responsible
              for their own tax reporting and professional advice.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">Business offers</h2>
            <p className="mt-2">
              Business offers are created and fulfilled by participating businesses.
              RaiseHub does not guarantee the availability, pricing, service quality,
              or fulfillment of a third-party offer. Users may not copy, resell,
              transfer, automate, or abuse offers, passes, accounts, campaigns, or
              fundraising tools.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">Additional fundraising rules</h2>
            <p className="mt-2">
              The public Fundraising and Payout Policy is incorporated into these
              Terms and contains additional eligibility, prohibited-use, verification,
              refund, dispute, and transfer rules.
            </p>
            <Link
              href="/fundraising-policy"
              className="mt-2 inline-flex font-semibold text-blue-700 hover:text-blue-800"
            >
              Read the Fundraising and Payout Policy →
            </Link>
          </section>

          <div className="border-t border-slate-200 pt-6">
            <PolicyReturnButton />
          </div>
        </div>
      </div>
    </main>
  )
}
