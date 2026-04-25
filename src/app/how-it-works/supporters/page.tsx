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
          Supporters get access to local deals while helping raise money for schools,
          teams, and community organizations.
        </p>

        <div className="mt-8 space-y-4">
          {[
            ['1. Sign up', 'Create your RaiseHub account.'],
            ['2. Browse local deals', 'See participating businesses and exclusive offers.'],
            ['3. Save offers to your pass', 'Keep your favorite deals ready to use.'],
            ['4. Use offers locally', 'Redeem deals while supporting local fundraising.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-white p-6 shadow">
              <h2 className="font-semibold text-gray-900">{title}</h2>
              <p className="mt-2 text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </div>

        <Link
          href="/signup"
          className="mt-8 inline-flex rounded-xl bg-yellow-600 px-6 py-3 font-medium text-white hover:bg-yellow-700"
        >
          Get Started
        </Link>
      </div>
    </main>
  )
}