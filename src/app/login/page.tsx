'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.2-2.07H12v3.92h5.37a4.6 4.6 0 0 1-1.99 3.02v2.55h3.22c1.89-1.74 3-4.31 3-7.42Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.89 6.6-2.35l-3.22-2.55c-.89.6-2.03.95-3.38.95-2.6 0-4.8-1.75-5.59-4.11H3.09v2.63A9.98 9.98 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.94A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.94V7.43H3.09A10 10 0 0 0 2 12c0 1.61.39 3.13 1.09 4.57l3.32-2.63Z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.96 2.96 14.7 2 12 2a9.98 9.98 0 0 0-8.91 5.43l3.32 2.63C7.2 7.7 9.4 5.95 12 5.95Z" />
    </svg>
  )
}

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

  async function handleOAuth(provider: 'google') {
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
    <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-10 sm:px-8 sm:py-16">
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

        <form onSubmit={handleLogin} className="mt-7 space-y-4">
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

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Or continue with
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={Boolean(oauthProvider)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <GoogleIcon />
          {oauthProvider === 'google' ? 'Connecting...' : 'Google sign-in'}
        </button>

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
