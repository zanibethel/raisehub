import Link from 'next/link'

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
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-gray-900">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          RaiseHub trust and safety
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Fundraising and Payout Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated July 23, 2026</p>

        <div className="mt-8 space-y-7 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="text-lg font-bold text-gray-900">Who may organize</h2>
            <p className="mt-2">
              Organization campaigns must be created by an authorized representative.
              Personal campaigns, when enabled, must be created by a verified adult who
              is the beneficiary or can explain and document their relationship to the
              beneficiary. RaiseHub may set lower limits or require enhanced review for
              new, personal, repeat, or higher-value campaigns.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">Required verification</h2>
            <p className="mt-2">
              Organizers must complete Stripe-hosted identity, entity, tax, bank, and
              payout onboarding as required. RaiseHub may separately request public
              organization details, representative authorization, campaign-purpose
              evidence, invoices, estimates, affiliation records, or other documents
              reasonably necessary to review legitimacy and risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">Draft and publication</h2>
            <p className="mt-2">
              Organizers may prepare drafts before verification is complete. A campaign
              may not publish or accept payments until required Stripe capabilities are
              enabled and RaiseHub has approved the campaign for publication. Approval
              may be withdrawn if information changes or new risk is discovered.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">Prohibited campaigns</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {prohibitedCampaigns.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3">
              This list is not exhaustive. RaiseHub may reject activity that is unsafe,
              deceptive, high-risk, inconsistent with community fundraising, or not
              supported by its payment partners.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">Fees and supporter disclosure</h2>
            <p className="mt-2">
              The total supporter charge must be shown before payment. Campaign pages
              and checkout should explain the pass price, any optional additional
              contribution, applicable platform fee, and the organizer's estimated
              proceeds. Personal-campaign payments are not represented as charitable or
              tax-deductible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">Transfer and payout timing</h2>
            <p className="mt-2">
              A successful supporter payment does not mean funds have reached the
              organizer's bank. RaiseHub may hold transfers while payments settle and
              while it reviews fraud, refunds, disputes, campaign completion, account
              changes, or compliance concerns. After funds are transferred to a Stripe
              connected account, bank arrival remains subject to Stripe's payout
              schedule and the recipient's financial institution.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">Refunds, disputes, and reserves</h2>
            <p className="mt-2">
              RaiseHub may review refund requests and may issue, deny, or partially
              approve a refund based on the circumstances and applicable law. Transfers
              may be delayed, reduced, reversed, or offset to address refunds,
              chargebacks, payment disputes, suspected fraud, negative balances, fees,
              or processing obligations. Organizers must cooperate with evidence and
              response deadlines.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">Changes and reporting</h2>
            <p className="mt-2">
              Organizers must promptly report material changes to the beneficiary,
              purpose, goal, representative, payout recipient, or use of funds. Users
              may report suspicious campaigns to RaiseHub. RaiseHub will maintain an
              internal review record and may preserve information needed for fraud,
              dispute, legal, or compliance review.
            </p>
          </section>

          <Link
            href="/terms"
            className="inline-flex font-semibold text-blue-700 hover:text-blue-800"
          >
            ← Return to Terms of Use
          </Link>
        </div>
      </div>
    </main>
  )
}
