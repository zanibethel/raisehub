import Link from 'next/link'

export default function SupportersHowItWorksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50 px-8 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-yellow-700">
          ← Back to home
        </Link>

        <h1 className="mt-6 text-4xl font-bold text-yellow-600">
          How RaiseHub Works for Supporters
        </h1>

        <p className="mt-4 text-gray-700">
          Supporters unlock valuable local deals while helping schools, teams,
          nonprofits, and community organizations raise money.
        </p>

        <div className="mt-8 space-y-4">
          {[
            [
              '1. Explore local deals',
              'See participating businesses and the exclusive offers included with a RaiseHub pass.',
            ],
            [
              '2. Choose a fundraiser to support',
              'Select a current campaign during signup or follow a direct campaign link from someone you know.',
            ],
            [
              '3. Purchase your digital pass',
              'Your qualifying purchase supports the selected organization and unlocks access to participating offers.',
            ],
            [
              '4. Save and redeem offers locally',
              'Keep useful deals on your pass and redeem them at participating businesses during the access period.',
            ],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-white p-6 shadow">
              <h2 className="font-semibold text-gray-900">{title}</h2>
              <p className="mt-2 text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
          <p className="font-bold text-yellow-800">
            Save locally. Support something meaningful.
          </p>
          <p className="mt-2 text-sm leading-6 text-yellow-900">
            RaiseHub gives your purchase lasting value through reusable local
            offers while helping a fundraiser move closer to its goal.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup?source=offers"
            className="inline-flex justify-center rounded-xl bg-yellow-600 px-6 py-3 font-medium text-white hover:bg-yellow-700"
          >
            View Local Deals
          </Link>

          <Link
            href="/campaigns"
            className="inline-flex justify-center rounded-xl border border-yellow-300 bg-white px-6 py-3 font-medium text-yellow-700 hover:bg-yellow-50"
          >
            Browse Fundraisers
          </Link>
        </div>
      </div>
    </main>
  )
}
