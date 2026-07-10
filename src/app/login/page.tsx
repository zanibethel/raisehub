'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthProvider, setOauthProvider] = useState<string | null>(null)

  function getNextPath() {
    if (typeof window === 'undefined') return '/dashboard'

    const next = new URLSearchParams(window.location.search).get('next')

    return next?.startsWith('/') ? next : '/dashboard'
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    window.location.href = getNextPath()
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setOauthProvider(provider)
    setMessage('')

    const next = getNextPath()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next
    )}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    })

    if (error) {
      setMessage(error.message)
      setOauthProvider(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-12 sm:px-8 sm:py-16">
      <section className="mx-auto max-w-md rounded-3xl border border-white/70 bg-white/95 p-7 shadow-xl sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
          Welcome back
        </p>

        <h1 className="mt-3 text-3xl font-bold text-blue-700">
          Log in to RaiseHub
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Access your offers, fundraising activity, community impact, and
          account settings.
        </p>

        <div className="mt-7 space-y-3">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={Boolean(oauthProvider)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {oauthProvider === 'google'
              ? 'Connecting to Google...'
              : 'Continue with Google'}
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('apple')}
            disabled={Boolean(oauthProvider)}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-gray-900 disabled:opacity-50"
          >
            {oauthProvider === 'apple'
              ? 'Connecting to Apple...'
              : 'Continue with Apple'}
          </button>
        </div>

        <div className="my-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Or use email
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">Email</span>
            <input
              className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-gray-700">
                Password
              </span>

              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </Link>
            </div>

            <input
              className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        ) : null}

        <p className="mt-7 text-center text-sm text-gray-600">
          Need an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-green-700 hover:text-green-800"
          >
            Sign up free
          </Link>
        </p>
      </section>
    </main>
  )
}
