import Link from 'next/link'

import { getAppMode } from '@/lib/app-mode'

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

const fundraisingSteps = [
  {
    number: '1',
    title: 'Businesses add offers',
    description: 'Local businesses provide discounts that bring supporters back.',
    accent: 'border-green-200 bg-green-50 text-green-800',
  },
  {
    number: '2',
    title: 'Organizations launch',
    description: 'Schools and community groups sell a digital fundraising pass.',
    accent: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  {
    number: '3',
    title: 'Supporters buy',
    description: 'Each purchase supports the fundraiser and unlocks local savings.',
    accent: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  },
  {
    number: '4',
    title: 'Everyone benefits',
    description: 'Organizations earn, supporters save, and businesses gain customers.',
    accent: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  },
] as const

export default function HomePage() {
  const appMode = getAppMode()
  const liveHref = appMode === 'production' ? '/home' : 'https://raisehub.app/home'
  const demoHref = appMode === 'demo' ? '/home' : 'https://demo.raisehub.app/home'

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-4 py-8 text-gray-900 sm:px-8 sm:py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-160px] h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-green-300/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <p className="inline-flex rounded-full border border-blue-200 bg-white/85 px-4 py-1 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
            Fundraising that benefits everyone
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-blue-700 sm:text-6xl">RaiseHub</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-700 sm:text-lg">
            Support organizations. Reward local businesses. Build stronger communities.
          </p>
        </header>

        <section
          aria-labelledby="how-raisehub-works"
          className="mt-8 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-xl backdrop-blur sm:mt-10 sm:p-8"
        >
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 sm:text-sm sm:tracking-[0.18em]">
              One simple fundraising loop
            </p>
            <h2 id="how-raisehub-works" className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              How RaiseHub Works
            </h2>
            <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-gray-600 sm:mt-3 sm:text-base">
              Local offers power a fundraising pass that helps organizations raise money while rewarding supporters and participating businesses.
            </p>
          </div>

          <ol className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
            {fundraisingSteps.map((step) => (
              <li key={step.number} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold sm:h-10 sm:w-10 sm:text-lg ${step.accent}`}>
                  {step.number}
                </div>
                <h3 className="mt-3 text-sm font-bold leading-5 text-slate-950 sm:mt-4 sm:text-lg sm:font-semibold">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-gray-600 sm:mt-2 sm:text-sm sm:leading-6">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-semibold leading-5 text-blue-950 sm:mt-6 sm:px-5 sm:py-4 sm:text-base sm:leading-6">
            One purchase supports a fundraiser, rewards the seller, saves the customer money, and brings business back to local companies.
          </p>
        </section>

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
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">Real activity</span>
              </div>
              <h3 className="mt-4 text-2xl font-bold text-gray-900">Start or join a real fundraiser.</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Enter RaiseHub&apos;s production experience with normal authentication, onboarding, and Stripe payments.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-gray-700">
                {liveFeatures.map((feature) => (
                  <li key={feature} className="flex gap-3"><span className="font-bold text-blue-600" aria-hidden="true">✓</span><span>{feature}</span></li>
                ))}
              </ul>
              <Link href={liveHref} className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white shadow-lg transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                Enter Live Platform
              </Link>
            </article>

            <article className="flex flex-col rounded-3xl border border-green-200 bg-white/95 p-6 shadow-xl backdrop-blur sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">Interactive Demo</p>
                <span className="rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-900">Sample data only</span>
              </div>
              <h3 className="mt-4 text-2xl font-bold text-gray-900">Explore before creating an account.</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Experience every major role using realistic examples. All activity is simulated and separated from live organizations.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-gray-700">
                {demoFeatures.map((feature) => (
                  <li key={feature} className="flex gap-3"><span className="font-bold text-green-600" aria-hidden="true">✓</span><span>{feature}</span></li>
                ))}
              </ul>
              <Link href={demoHref} className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-center font-semibold text-white shadow-lg transition hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
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
