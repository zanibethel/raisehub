import Link from 'next/link'

export default function BusinessOnboardingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-16 text-gray-900">
      <section className="mx-auto max-w-2xl rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
          Business setup
        </p>

        <h1 className="mt-3 text-3xl font-bold text-blue-700">
          Welcome to RaiseHub
        </h1>

        <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-600">
          Your business onboarding experience is being prepared. Soon you will
          be able to complete your profile, select your checkout system, choose
          a redemption method, and create your first exclusive offer.
        </p>

        <div className="mt-8 rounded-2xl bg-green-50 p-5 text-left">
          <p className="font-semibold text-green-800">
            Your Community Partner account includes:
          </p>

          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>✓ A free business profile</li>
            <li>✓ Up to 3 active exclusive offers</li>
            <li>✓ Support for local organizations</li>
            <li>✓ Basic redemption and impact tracking</li>
          </ul>
        </div>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Continue to Dashboard
        </Link>
      </section>
    </main>
  )
}
