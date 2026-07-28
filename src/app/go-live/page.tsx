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
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Ready to use RaiseHub?
          </p>
          <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-5xl">
            What would you like to do next?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Explore real campaigns or choose the role that best matches how you want to participate.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {choices.map((choice) => (
            <article
              key={choice.title}
              className={`flex min-h-64 flex-col rounded-3xl border p-5 shadow-sm sm:p-6 ${choice.accent}`}
            >
              <h2 className="text-2xl font-black text-slate-950">
                {choice.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {choice.description}
              </p>
              <Link
                href={choice.href}
                className={`mt-auto inline-flex min-h-12 items-center justify-center rounded-2xl px-4 py-3 text-center text-sm font-bold text-white transition ${choice.actionClass}`}
              >
                {choice.action}
              </Link>
            </article>
          ))}
        </section>

        <div className="mt-6 text-center">
          <Link
            href={buildProductionUrl('/')}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Return to the homepage
          </Link>
        </div>
      </div>
    </main>
  )
}
