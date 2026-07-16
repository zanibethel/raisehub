import Link from 'next/link'

export default function OrganizationsHowItWorksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 px-8 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-blue-700">
          ← Back to home
        </Link>

        <h1 className="mt-6 text-4xl font-bold text-blue-700">
          How RaiseHub Works for Organizations
        </h1>

        <p className="mt-4 text-gray-700">
          Organizations use RaiseHub to create fundraisers powered by valuable
          local business deals.
        </p>

        <div className="mt-8 space-y-4">
          {[
            [
              '1. Create your organization account',
              'Manage your organization, fundraising campaigns, sellers, supporters, and results from one place.',
            ],
            [
              '2. Build and share your fundraiser',
              'Set your goal, pass price, important dates, and shareable campaign link.',
            ],
            [
              '3. Give supporters real local value',
              'Supporters purchase a digital pass filled with participating local business offers.',
            ],
            [
              '4. Track progress and results',
              'See qualifying passes sold, active sellers, supporters, and funds raised.',
            ],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-white p-6 shadow">
              <h2 className="font-semibold text-gray-900">{title}</h2>
              <p className="mt-2 text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="font-bold text-blue-800">
            Clear costs. No surprises.
          </p>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            Creating your organization account is free. RaiseHub earns a
            portion of each fundraising pass sold, so there is no required
            upfront subscription. Your organization keeps its share of every
            qualifying pass sale, and optional donations go directly toward
            the selected organization. Any applicable payment-processing fees
            will be shown before launch.
          </p>
        </div>

        <Link
          href="/signup/organization"
          className="mt-8 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Start Raising Funds
        </Link>
      </div>
    </main>
  )
}
