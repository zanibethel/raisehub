'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OrganizationSignupPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const destination = '/dashboard'

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'organization',
          },
          emailRedirectTo: `${
            window.location.origin
          }/auth/callback?next=${encodeURIComponent(
            destination
          )}`,
        },
      })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      window.location.href = destination
      return
    }

    setMessage(
      'Account created. Check your email to confirm your account, then continue to your organization dashboard.'
    )
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-4 py-8 text-slate-950 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to RaiseHub
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="px-1 pb-8 pt-2 lg:pr-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              RaiseHub Fundraising
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-tight text-gray-900">
              Do you need to raise funds?
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              RaiseHub helps schools, teams, nonprofits, clubs, and community
              groups raise money by selling digital passes filled with
              exclusive offers from local businesses.
            </p>

            <div className="mt-9 border-y border-slate-200 py-7">
              <h2 className="text-xl font-black text-slate-950">
                How fundraising with RaiseHub works
              </h2>

              <div className="mt-5 divide-y divide-slate-200">
                {[
                  {
                    number: '1',
                    title: 'Create your organization account',
                    description:
                      'Use one account to manage your organization, fundraising campaigns, sellers, supporters, and results.',
                  },
                  {
                    number: '2',
                    title: 'Build your first fundraiser',
                    description:
                      'Set your campaign name, fundraising goal, important dates, and organization details. RaiseHub applies the current managed pass price automatically.',
                  },
                  {
                    number: '3',
                    title: 'Invite sellers and share your campaign',
                    description:
                      'Give students, team members, volunteers, or supporters a simple way to share and sell your fundraiser.',
                  },
                  {
                    number: '4',
                    title: 'Earn from every qualifying pass sold',
                    description:
                      'Supporters purchase a pass, unlock local savings, and help your organization move closer to its goal.',
                  },
                ].map((step) => (
                  <div
                    key={step.number}
                    className="flex gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                      {step.number}
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-5 text-center">
              <div className="px-2"><p className="text-lg font-black text-blue-700 sm:text-xl">Simple Setup</p><p className="mt-1 text-xs leading-5 text-slate-500">Create and launch campaigns in one place</p></div>
              <div className="px-2"><p className="text-lg font-black text-green-700 sm:text-xl">Local Value</p><p className="mt-1 text-xs leading-5 text-slate-500">Passes include participating business offers</p></div>
              <div className="px-2"><p className="text-lg font-black text-amber-700 sm:text-xl">Live Progress</p><p className="mt-1 text-xs leading-5 text-slate-500">Track sales, sellers, supporters, and funds raised</p></div>
            </div>

            <div className="mt-8 border-l-4 border-blue-500 pl-4 text-sm leading-6 text-slate-600">
              <strong className="text-gray-900">
                RaiseHub is more than a donation page.
              </strong>{' '}
              Supporters receive useful local savings while your organization
              gains a stronger reason for people to participate and share.
            </div>

            <div className="mt-6 border-l-4 border-green-500 pl-4 text-sm leading-6 text-slate-700">
              <h2 className="text-lg font-bold text-blue-800">
                Clear costs. No surprises.
              </h2>

              <p className="mt-2">
                Creating your organization account is free. RaiseHub earns a
                portion of each fundraising pass sold, so there is no required
                upfront subscription. Your organization keeps its share of
                every qualifying pass sale, and optional donations go directly
                toward the selected organization. Any applicable
                payment-processing fees will be shown before launch.
              </p>
            </div>
          </section>

          <aside className="h-fit border-t border-slate-200 pt-7 lg:sticky lg:top-6 lg:rounded-3xl lg:border lg:bg-white lg:p-8 lg:shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Start your fundraiser
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              Create an Organization Account
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Create your account now. After email confirmation, you will enter
              your organization dashboard and begin setting up your first
              campaign.
            </p>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              <p className="font-bold">School, PTA/PTO, booster club, or student group?</p>
              <p className="mt-1">
                Review the school setup path before entering tax or payout information, and use the
                IT access page if your district filters school computers.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/schools" className="font-bold text-blue-700 hover:underline">
                  School setup →
                </Link>
                <Link href="/schools/it-access" className="font-bold text-blue-700 hover:underline">
                  IT access →
                </Link>
              </div>
            </div>

            <form
              onSubmit={handleSignup}
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="organization-signup-email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Organization email
                </label>
                <input
                  id="organization-signup-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@organization.org"
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="organization-signup-password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="organization-signup-password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="At least 8 characters"
                  minLength={8}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>

              <button
                disabled={loading}
                className="min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? 'Creating account...'
                  : 'Start Raising Funds'}
              </button>
            </form>

            {message ? (
              <p
                className={`mt-4 text-sm ${
                  message.startsWith(
                    'Account created'
                  )
                    ? 'text-green-700'
                    : 'text-red-600'
                }`}
              >
                {message}
              </p>
            ) : null}

            <div className="mt-6 border-t border-gray-200 pt-5 text-sm text-gray-600">
              <p>
                Already have an account?{' '}
                <Link
                  href="/login?next=/dashboard"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Log in here
                </Link>
              </p>

              <p className="mt-3">
                Looking for local deals?{' '}
                <Link
                  href="/signup"
                  className="font-semibold text-yellow-700 hover:underline"
                >
                  Customer signup →
                </Link>
              </p>

              <p className="mt-3">
                Own a local business?{' '}
                <Link
                  href="/signup/business"
                  className="font-semibold text-green-700 hover:underline"
                >
                  Business signup →
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
