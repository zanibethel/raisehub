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
          Businesses use RaiseHub to promote offers, gain local visibility, and support
          fundraising efforts in their community.
        </p>

        <div className="mt-8 space-y-4">
          {[
            ['1. Create your business profile', 'Add your logo, contact info, website, and map link.'],
            ['2. Add offers', 'List up to 3 active offers free, with upgrade options for more.'],
            ['3. Track redemptions', 'See which offers are being used and what performs best.'],
            ['4. Boost visibility', 'Upgrade later for more offers and stronger placement.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-white p-6 shadow">
              <h2 className="font-semibold text-gray-900">{title}</h2>
              <p className="mt-2 text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </div>

        <Link
          href="/signup"
          className="mt-8 inline-flex rounded-xl bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
        >
          Join as a Business
        </Link>
      </div>
    </main>
  )
}