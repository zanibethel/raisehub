import Link from 'next/link'

const liveFeatures = [
  'Create or manage a real organization',
  'Join active campaigns and purchase real coupon passes',
  'Manage a real business or participate as a seller',
  'Use real accounts, records, and payments',
]

const demoFeatures = [
  'No signup required and no real payments',
  'Explore supporter, business, and organization roles',
  'Use realistic sample campaigns, offers, and activity',
  'Nothing affects the Live Platform',
]

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-4 py-8 text-gray-900 sm:px-8 sm:py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-160px] h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-green-300/25 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center">
        <header className="text-center">
          <p className="inline-flex rounded-full border border-blue-200 bg-white/85 px-4 py-1 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
            Fundraising that benefits everyone
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-blue-700 sm:text-6xl">
            RaiseHub
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-700 sm:text-lg">
            Support organizations. Reward local businesses. Build stronger communities.
          </p>
        </header>

        <section aria-labelledby="experience-heading" className="mt-8 sm:mt-10">
          <div className="text-center">
            <h2 id="experience-heading" className="text-2xl font-bold text-gray-900 sm:text-3xl">
              How would you like to experience RaiseHub today?
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
              Choose the real operating platform or explore safely with sample data first.
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <article className="flex flex-col rounded-3xl border border-blue-200 bg-white/95 p-6 shadow-xl backdrop-blur sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Live Platform</p>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                  Real activity
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-bold text-gray-900">Start or join a real fundraiser.</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Enter RaiseHub&apos;s production experience with normal authentication, onboarding, and Stripe payments.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-gray-700">
                {liveFeatures.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="font-bold text-blue-600" aria-hidden="true">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="https://raisehub.app/campaigns"
                className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white shadow-lg transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Enter Live Platform
              </Link>
            </article>

            <article className="flex flex-col rounded-3xl border border-green-200 bg-white/95 p-6 shadow-xl backdrop-blur sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">Interactive Demo</p>
                <span className="rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-900">
                  Sample data only
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-bold text-gray-900">Explore before creating an account.</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Experience every major role using realistic examples. All activity is simulated and separated from live organizations.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-gray-700">
                {demoFeatures.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="font-bold text-green-600" aria-hidden="true">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="https://demo.raisehub.app/demo"
                className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-center font-semibold text-white shadow-lg transition hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
              >
                Launch Interactive Demo
              </Link>
            </article>
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-gray-500">
          Live and Interactive Demo use one RaiseHub product with a strict boundary between real and sample activity.
        </footer>
      </div>
    </main>
  )
}
