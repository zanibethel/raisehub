'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BusinessSignupPage() {
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

    const destination = '/onboarding/business'

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'business',
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
      'Account created. Check your email to confirm your account, then continue setting up your business.'
    )
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 px-5 py-10 text-gray-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to RaiseHub
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-green-100 bg-white/95 p-7 shadow-xl sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
              RaiseHub Community Partner
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-tight text-gray-900">
              Support your community while growing your business
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Become an exclusive RaiseHub partner by offering valuable local
              deals that help schools, teams, nonprofits, and community groups
              sell more fundraising passes.
            </p>

            <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <h2 className="text-lg font-bold text-blue-800">
                How your partnership works
              </h2>

              <div className="mt-5 space-y-5">
                {[
                  {
                    number: '1',
                    title: 'Create your business account',
                    description:
                      'Use one account to manage your business profile, offers, redemption settings, and performance.',
                  },
                  {
                    number: '2',
                    title: 'Complete your Community Partner profile',
                    description:
                      'Add your business information, location, branding, social links, and preferred redemption process.',
                  },
                  {
                    number: '3',
                    title: 'Create exclusive local offers',
                    description:
                      'Businesses can create up to three active offers on the free plan, with upgrade options available later.',
                  },
                  {
                    number: '4',
                    title: 'Reach customers who support local fundraisers',
                    description:
                      'Eligible offers appear across RaiseHub deal and partner experiences, helping bring new customers through your door.',
                  },
                ].map((step) => (
                  <div
                    key={step.number}
                    className="flex gap-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 font-bold text-white">
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
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="text-2xl font-bold text-green-700">
                  3 Offers
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Free active offer allowance
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-2xl font-bold text-blue-700">
                  Local Reach
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Visibility with community supporters
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
                <p className="text-2xl font-bold text-yellow-700">
                  Shared Impact
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Better fundraising through better value
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
              <strong className="text-gray-900">
                You are not being asked to donate money.
              </strong>{' '}
              Your business supports the community by providing offers that
              make RaiseHub passes valuable to local customers.
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-green-100 bg-white p-7 shadow-xl sm:p-8">
            <p className="text-sm font-semibold text-green-700">
              Free to get started
            </p>

            <h2 className="mt-2 text-2xl font-bold text-blue-700">
              Become a RaiseHub Partner
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Create your account now. After email confirmation, we will guide
              you through the complete business setup process.
            </p>

            <form
              onSubmit={handleSignup}
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="business-signup-email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Business email
                </label>
                <input
                  id="business-signup-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@business.com"
                  className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="business-signup-password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="business-signup-password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="At least 8 characters"
                  minLength={8}
                  className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-green-500"
                  required
                />
              </div>

              <button
                disabled={loading}
                className="w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white shadow transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? 'Creating account...'
                  : 'Become a RaiseHub Partner'}
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
                  href="/login?next=/onboarding/business"
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
                Need to raise funds?{' '}
                <Link
                  href="/signup/organization"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Organization signup →
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
