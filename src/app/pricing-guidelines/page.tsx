import Link from 'next/link'

const qualifyingExamples = [
  'High-volume fundraising campaigns',
  'Large school districts or multi-organization programs',
  'Verified nonprofit or community hardship circumstances',
  'Limited promotional or launch programs',
  'Strategic community partnerships',
  'Campaigns that require a custom pricing structure',
  'Owner-approved pilots or special programs',
]

export default function PricingGuidelinesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-4 py-10 sm:px-8 sm:py-16">
      <article className="mx-auto max-w-3xl rounded-3xl border border-white/70 bg-white/95 p-6 shadow-xl sm:p-10">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          ← Back to dashboard
        </Link>

        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-green-700">
          RaiseHub managed pricing
        </p>
        <h1 className="mt-3 text-3xl font-bold text-blue-900">
          Pricing guidelines
        </h1>
        <p className="mt-4 leading-7 text-gray-700">
          Most campaigns use RaiseHub&apos;s standard pass price and platform fee. This keeps checkout, campaign earnings, and supporter expectations consistent across the platform.
        </p>

        <section className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5">
          <h2 className="text-lg font-bold text-green-950">
            Optional donations go fully to the organization
          </h2>
          <p className="mt-2 text-sm leading-6 text-green-900">
            RaiseHub does not keep a percentage of optional donations. The managed platform fee applies only to the fundraising pass price. Any optional donation is recorded as organization earnings in full.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h2 className="text-lg font-bold text-blue-900">
            When special pricing may be considered
          </h2>
          <p className="mt-2 text-sm leading-6 text-blue-800">
            RaiseHub may consider a different pricing arrangement for qualifying campaigns or organizations. Examples may include:
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-blue-900">
            {qualifyingExamples.map((example) => (
              <li key={example} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{example}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">
            How pricing decisions are made
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-700">
            Pricing exceptions are reviewed individually and are not guaranteed. RaiseHub may consider projected sales volume, campaign structure, platform and payment-processing costs, operational requirements, risk, partnership value, and community impact.
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-700">
            Approved special pricing may be limited to a specific campaign, organization, location, or time period. RaiseHub may modify or discontinue an exception when the applicable circumstances change.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-base font-bold text-amber-950">
            Requesting consideration
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            An organization may contact RaiseHub support to ask whether its circumstances qualify for review. Submitting a request does not change the campaign&apos;s current price and does not guarantee approval.
          </p>
        </section>

        <p className="mt-8 text-xs leading-5 text-gray-500">
          These guidelines describe general eligibility considerations and do not create a promise of discounted or custom pricing. The price shown in campaign management is the price currently assigned to that campaign.
        </p>
      </article>
    </main>
  )
}
