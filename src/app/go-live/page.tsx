import Link from 'next/link'

import { buildProductionUrl } from '@/lib/production-url'

export const metadata = {
  title: 'Get Started | RaiseHub',
  description:
    'Browse active fundraisers or choose how you want to participate in RaiseHub.',
}

const choices = [
  {
    title: 'Explore campaigns',
    description:
      'Browse active fundraisers and choose a campaign to support.',
    href: buildProductionUrl('/campaigns', { live: '1' }),
    action: 'Browse campaigns',
    accent: 'border-blue-200 bg-blue-50',
    actionClass: 'bg-blue-700 hover:bg-blue-800',
  },
  {
    title: 'Support a campaign',
    description:
      'Create a supporter account, select a fundraiser, and purchase or share a RaiseHub Pass.',
    href: buildProductionUrl('/signup', { live: '1', role: 'customer' }),
    action: 'Sign up as a supporter',
    accent: 'border-emerald-200 bg-emerald-50',
    actionClass: 'bg-emerald-700 hover:bg-emerald-800',
  },
  {
    title: 'I own a business',
    description:
      'Join RaiseHub as a local business and create offers that bring supporters through your door.',
    href: buildProductionUrl('/signup/business', {
      live: '1',
      role: 'business',
    }),
    action: 'Register my business',
    accent: 'border-amber-200 bg-amber-50',
    actionClass: 'bg-amber-700 hover:bg-amber-800',
  },
  {
    title: 'Start a fundraiser',
    description:
      'Create an organization workspace and launch a campaign for your school, team, group, or cause.',
    href: buildProductionUrl('/signup/organization', {
      live: '1',
      role: 'organization',
    }),
    action: 'Start a fundraiser',
    accent: 'border-violet-200 bg-violet-50',
    actionClass: 'bg-violet-700 hover:bg-violet-800',
  },
]

export default function GoLivePage() {
  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-center text-white shadow-xl sm:px-8 sm:py-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
            Ready to use RaiseHub?
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            What would you like to do next?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Explore real campaigns or choose the role that best matches how you want to participate.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {choices.map((choice) => (
            <article
              key={choice.title}
              className={`flex min-h-56 flex-col rounded-2xl border p-5 shadow-sm sm:p-6 ${choice.accent}`}
            >
              <h2 className="text-xl font-black text-slate-950">
                {choice.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {choice.description}
              </p>
              <Link
                href={choice.href}
                className={`mt-auto inline-flex min-h-12 items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-black text-white transition ${choice.actionClass}`}
              >
                {choice.action}
              </Link>
            </article>
          ))}
        </section>

        <div className="mt-6 text-center">
          <Link
            href={buildProductionUrl('/')}
            className="inline-flex min-h-11 items-center justify-center text-sm font-black text-blue-700"
          >
            Return to the homepage
          </Link>
        </div>
      </div>
    </main>
  )
}
