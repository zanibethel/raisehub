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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 px-5 py-10 text-gray-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to RaiseHub
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-blue-100 bg-white/95 p-7 shadow-xl sm:p-10">
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

            <div className="mt-8 rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
              <h2 className="text-lg font-bold text-yellow-800">
                How fundraising with RaiseHub works
              </h2>

              <div className="mt-5 space-y-5">
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
                      'Set your campaign name, fundraising goal, pass price, important dates, and organization details.',
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
                    className="flex gap-4"
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

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-2xl font-bold text-blue-700">
                  Simple Setup
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Create and launch campaigns in one place
                </p>
              </div>

              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="text-2xl font-bold text-green-700">
                  Local Value
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Passes include participating business offers
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
                <p className="text-2xl font-bold text-yellow-700">
                  Live Progress
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Track sales, sellers, supporters, and funds raised
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
              <strong className="text-gray-900">
                RaiseHub is more than a donation page.
              </strong>{' '}
              Supporters receive useful local savings while your organization
              gains a stronger reason for people to participate and share.
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-blue-100 bg-white p-7 shadow-xl sm:p-8">
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
                  className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
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
                  className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
