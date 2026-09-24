import Link from 'next/link'

import { getAppMode } from '@/lib/app-mode'
import ModeTip from './components/mode-tip'

const fundraisingSteps = [
  {
    number: '1',
    icon: '🏪',
    title: 'Businesses add offers',
    description: 'Local discounts that bring supporters back.',
    accent: 'border-green-200 bg-green-50 text-green-800',
  },
  {
    number: '2',
    icon: '👥',
    title: 'Organizations launch',
    description: 'Schools and groups sell a digital fundraising pass.',
    accent: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  {
    number: '3',
    icon: 'purchase',
    title: 'Supporters buy',
    description: 'Each purchase supports the organization.',
    accent: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  {
    number: '4',
    icon: '↗',
    title: 'Everyone benefits',
    description: 'Organizations earn, businesses gain customers, and communities grow.',
    accent: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  },
] as const

export default function HomePage() {
  const appMode = getAppMode()
  const liveHref = appMode === 'production' ? '/home' : 'https://raisehub.app/home'
  const demoHref = appMode === 'demo' ? '/home' : 'https://demo.raisehub.app/home'

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-160px] h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-green-300/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <p className="inline-flex rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-sm font-black text-blue-700 shadow-sm backdrop-blur">
            Fundraising that benefits everyone
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-blue-600 sm:text-6xl">
            RaiseHub
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600 sm:text-lg">
            Support organizations. Reward local businesses. Build stronger communities.
          </p>
        </header>

        <section
          aria-labelledby="how-raisehub-works"
          className="mt-8 rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-xl backdrop-blur sm:mt-10 sm:p-8"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              One simple fundraising loop
            </p>
            <h2
              id="how-raisehub-works"
              className="mt-2 text-3xl font-black tracking-tight text-slate-950"
            >
              How RaiseHub Works
            </h2>
          </div>

          <ol className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            {fundraisingSteps.map((step) => (
              <li
                key={step.number}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-base font-black ${step.accent}`}>
                    {step.number}
                  </div>
                  {step.number === '3' ? (
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xl font-black text-amber-700"
                      aria-hidden="true"
                    >
                      &#36;
                    </span>
                  ) : (
                    <span className="text-2xl" aria-hidden="true">
                      {step.icon}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-base font-black leading-5 text-slate-950 sm:text-lg">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            <div className="flex gap-2">
              <Link
                href={liveHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center font-black text-white shadow-md transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Enter Live Platform
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              <ModeTip label="What is the Live Platform?" tone="blue">
                <strong className="block text-slate-950">Live Platform</strong>
                Uses real accounts, real records, and production data. Purchases and payments can be real, and activity affects the live RaiseHub platform.
              </ModeTip>
            </div>

            <div className="flex gap-2">
              <Link
                href={demoHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border-2 border-green-500 bg-green-50 px-5 py-3 text-center font-black text-green-700 transition hover:bg-green-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
              >
                Launch Interactive Demo
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              <ModeTip label="What is the Interactive Demo?" tone="green">
                <strong className="block text-slate-950">Interactive Demo</strong>
                Uses realistic sample accounts and sample data. No real payments are required, and demo activity stays separated from the Live Platform.
              </ModeTip>
            </div>
          </div>
        </section>

        <footer className="mt-7 text-center text-xs leading-5 text-slate-500">
          Live and Interactive Demo use the same RaiseHub product with a strict boundary between real and sample activity.
        </footer>
      </div>
    </main>
  )
}
,
    title: 'Supporters buy',
    description: 'Each purchase supports the organization.',
    accent: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  {
    number: '4',
    icon: '↗',
    title: 'Everyone benefits',
    description: 'Organizations earn, businesses gain customers, and communities grow.',
    accent: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  },
] as const

export default function HomePage() {
  const appMode = getAppMode()
  const liveHref = appMode === 'production' ? '/home' : 'https://raisehub.app/home'
  const demoHref = appMode === 'demo' ? '/home' : 'https://demo.raisehub.app/home'

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-160px] h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-green-300/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <p className="inline-flex rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-sm font-black text-blue-700 shadow-sm backdrop-blur">
            Fundraising that benefits everyone
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-blue-600 sm:text-6xl">
            RaiseHub
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600 sm:text-lg">
            Support organizations. Reward local businesses. Build stronger communities.
          </p>
        </header>

        <section
          aria-labelledby="how-raisehub-works"
          className="mt-8 rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-xl backdrop-blur sm:mt-10 sm:p-8"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              One simple fundraising loop
            </p>
            <h2
              id="how-raisehub-works"
              className="mt-2 text-3xl font-black tracking-tight text-slate-950"
            >
              How RaiseHub Works
            </h2>
          </div>

          <ol className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            {fundraisingSteps.map((step) => (
              <li
                key={step.number}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-base font-black ${step.accent}`}>
                    {step.number}
                  </div>
                  <span className="text-2xl" aria-hidden="true">
                    {step.icon}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-black leading-5 text-slate-950 sm:text-lg">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            <div className="flex gap-2">
              <Link
                href={liveHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center font-black text-white shadow-md transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Enter Live Platform
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              <ModeTip label="What is the Live Platform?" tone="blue">
                <strong className="block text-slate-950">Live Platform</strong>
                Uses real accounts, real records, and production data. Purchases and payments can be real, and activity affects the live RaiseHub platform.
              </ModeTip>
            </div>

            <div className="flex gap-2">
              <Link
                href={demoHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border-2 border-green-500 bg-green-50 px-5 py-3 text-center font-black text-green-700 transition hover:bg-green-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
              >
                Launch Interactive Demo
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              <ModeTip label="What is the Interactive Demo?" tone="green">
                <strong className="block text-slate-950">Interactive Demo</strong>
                Uses realistic sample accounts and sample data. No real payments are required, and demo activity stays separated from the Live Platform.
              </ModeTip>
            </div>
          </div>
        </section>

        <footer className="mt-7 text-center text-xs leading-5 text-slate-500">
          Live and Interactive Demo use the same RaiseHub product with a strict boundary between real and sample activity.
        </footer>
      </div>
    </main>
  )
}
,
    title: 'Supporters buy',
    description: 'Each purchase supports the organization.',
    accent: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  {
    number: '4',
    icon: '↗',
    title: 'Everyone benefits',
    description: 'Organizations earn, businesses gain customers, and communities grow.',
    accent: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  },
] as const

export default function HomePage() {
  const appMode = getAppMode()
  const liveHref = appMode === 'production' ? '/home' : 'https://raisehub.app/home'
  const demoHref = appMode === 'demo' ? '/home' : 'https://demo.raisehub.app/home'

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-160px] h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-green-300/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <p className="inline-flex rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-sm font-black text-blue-700 shadow-sm backdrop-blur">
            Fundraising that benefits everyone
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-blue-600 sm:text-6xl">
            RaiseHub
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600 sm:text-lg">
            Support organizations. Reward local businesses. Build stronger communities.
          </p>
        </header>

        <section
          aria-labelledby="how-raisehub-works"
          className="mt-8 rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-xl backdrop-blur sm:mt-10 sm:p-8"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              One simple fundraising loop
            </p>
            <h2
              id="how-raisehub-works"
              className="mt-2 text-3xl font-black tracking-tight text-slate-950"
            >
              How RaiseHub Works
            </h2>
          </div>

          <ol className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            {fundraisingSteps.map((step) => (
              <li
                key={step.number}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-base font-black ${step.accent}`}>
                    {step.number}
                  </div>
                  {step.number === '3' ? (
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xl font-black text-amber-700"
                      aria-hidden="true"
                    >
                      {step.icon}
                    </span>
                  ) : (
                    <span className="text-2xl" aria-hidden="true">
                      {step.icon}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-base font-black leading-5 text-slate-950 sm:text-lg">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            <div className="flex gap-2">
              <Link
                href={liveHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center font-black text-white shadow-md transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Enter Live Platform
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              <ModeTip label="What is the Live Platform?" tone="blue">
                <strong className="block text-slate-950">Live Platform</strong>
                Uses real accounts, real records, and production data. Purchases and payments can be real, and activity affects the live RaiseHub platform.
              </ModeTip>
            </div>

            <div className="flex gap-2">
              <Link
                href={demoHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border-2 border-green-500 bg-green-50 px-5 py-3 text-center font-black text-green-700 transition hover:bg-green-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
              >
                Launch Interactive Demo
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              <ModeTip label="What is the Interactive Demo?" tone="green">
                <strong className="block text-slate-950">Interactive Demo</strong>
                Uses realistic sample accounts and sample data. No real payments are required, and demo activity stays separated from the Live Platform.
              </ModeTip>
            </div>
          </div>
        </section>

        <footer className="mt-7 text-center text-xs leading-5 text-slate-500">
          Live and Interactive Demo use the same RaiseHub product with a strict boundary between real and sample activity.
        </footer>
      </div>
    </main>
  )
}
,
    title: 'Supporters buy',
    description: 'Each purchase supports the organization.',
    accent: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  {
    number: '4',
    icon: '↗',
    title: 'Everyone benefits',
    description: 'Organizations earn, businesses gain customers, and communities grow.',
    accent: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  },
] as const

export default function HomePage() {
  const appMode = getAppMode()
  const liveHref = appMode === 'production' ? '/home' : 'https://raisehub.app/home'
  const demoHref = appMode === 'demo' ? '/home' : 'https://demo.raisehub.app/home'

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-160px] h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-green-300/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <p className="inline-flex rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-sm font-black text-blue-700 shadow-sm backdrop-blur">
            Fundraising that benefits everyone
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-blue-600 sm:text-6xl">
            RaiseHub
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600 sm:text-lg">
            Support organizations. Reward local businesses. Build stronger communities.
          </p>
        </header>

        <section
          aria-labelledby="how-raisehub-works"
          className="mt-8 rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-xl backdrop-blur sm:mt-10 sm:p-8"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              One simple fundraising loop
            </p>
            <h2
              id="how-raisehub-works"
              className="mt-2 text-3xl font-black tracking-tight text-slate-950"
            >
              How RaiseHub Works
            </h2>
          </div>

          <ol className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            {fundraisingSteps.map((step) => (
              <li
                key={step.number}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-base font-black ${step.accent}`}>
                    {step.number}
                  </div>
                  <span className="text-2xl" aria-hidden="true">
                    {step.icon}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-black leading-5 text-slate-950 sm:text-lg">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            <div className="flex gap-2">
              <Link
                href={liveHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center font-black text-white shadow-md transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Enter Live Platform
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              <ModeTip label="What is the Live Platform?" tone="blue">
                <strong className="block text-slate-950">Live Platform</strong>
                Uses real accounts, real records, and production data. Purchases and payments can be real, and activity affects the live RaiseHub platform.
              </ModeTip>
            </div>

            <div className="flex gap-2">
              <Link
                href={demoHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border-2 border-green-500 bg-green-50 px-5 py-3 text-center font-black text-green-700 transition hover:bg-green-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
              >
                Launch Interactive Demo
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              <ModeTip label="What is the Interactive Demo?" tone="green">
                <strong className="block text-slate-950">Interactive Demo</strong>
                Uses realistic sample accounts and sample data. No real payments are required, and demo activity stays separated from the Live Platform.
              </ModeTip>
            </div>
          </div>
        </section>

        <footer className="mt-7 text-center text-xs leading-5 text-slate-500">
          Live and Interactive Demo use the same RaiseHub product with a strict boundary between real and sample activity.
        </footer>
      </div>
    </main>
  )
}
