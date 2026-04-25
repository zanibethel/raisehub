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
          Organizations can use RaiseHub to create fundraisers powered by valuable
          local business deals.
        </p>

        <div className="mt-8 space-y-4">
          {[
            ['1. Create a campaign', 'Set up a fundraiser for your school, team, club, or organization.'],
            ['2. Share your link or QR code', 'Supporters can buy access and help your campaign grow.'],
            ['3. Promote local offers', 'Participating businesses provide deals supporters can use.'],
            ['4. Track progress', 'See passes sold, money raised, and campaign activity.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-white p-6 shadow">
              <h2 className="font-semibold text-gray-900">{title}</h2>
              <p className="mt-2 text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </div>

        <Link
          href="/signup"
          className="mt-8 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Start Fundraising
        </Link>
      </div>
    </main>
  )
}