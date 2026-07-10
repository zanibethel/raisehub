'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setErrorMessage('')

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      '/update-password'
    )}`

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    setMessage(
      'Check your email for a password-reset link. You can close this page after opening the email.'
    )
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-16">
      <section className="mx-auto max-w-md rounded-3xl border border-white/70 bg-white/95 p-7 shadow-xl sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
          Account recovery
        </p>

        <h1 className="mt-3 text-3xl font-bold text-blue-700">
          Reset your password
        </h1>

        <p className="mt-4 text-sm leading-6 text-gray-600">
          Enter the email connected to your RaiseHub account. We’ll send you a
          secure link for choosing a new password.
        </p>

        <form onSubmit={handleReset} className="mt-7 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Account email
            </span>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
            />
          </label>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending reset link...' : 'Send Password Reset Link'}
          </button>
        </form>

        {message ? (
          <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-800">
            {message}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <Link
          href="/login"
          className="mt-7 block text-center text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Return to login
        </Link>
      </section>
    </main>
  )
}
