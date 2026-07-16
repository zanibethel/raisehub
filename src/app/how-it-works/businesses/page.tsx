import Link from 'next/link'

export default function BusinessesHowItWorksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 px-8 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-green-700">
          ← Back to home
        </Link>

        <h1 className="mt-6 text-4xl font-bold text-green-700">
          How RaiseHub Works for Businesses
        </h1>

        <p className="mt-4 text-gray-700">
          Businesses use RaiseHub to promote offers, gain local visibility, and
          support fundraising efforts in their community.
        </p>

        <div className="mt-8 space-y-4">
          {[
            [
              '1. Create your business profile',
              'Add your logo, contact information, website, map link, and preferred redemption process.',
            ],
            [
              '2. Create exclusive local offers',
              'Create and manage up to 3 active offers with no required subscription.',
            ],
            [
              '3. Track redemptions',
              'See which offers are being used and learn what performs best with local customers.',
            ],
            [
              '4. Grow when you are ready',
              'Stay on the free plan or upgrade only when you want additional offers or advanced features.',
            ],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-white p-6 shadow">
              <h2 className="font-semibold text-gray-900">{title}</h2>
              <p className="mt-2 text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-green-100 bg-green-50 p-5">
          <p className="font-bold text-green-800">
            Start free. Stay free.
          </p>
          <p className="mt-2 text-sm leading-6 text-green-900">
            No subscription is required to manage up to 3 active offers.
            Upgrade only when your business needs more offers or advanced
            tools.
          </p>
        </div>

        <Link
          href="/signup/business"
          className="mt-8 inline-flex rounded-xl bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
        >
          Become a RaiseHub Partner
        </Link>
      </div>
    </main>
  )
}
