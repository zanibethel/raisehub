'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    async function verifyRecoverySession() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (!mounted) return

      if (error || !user) {
        setHasRecoverySession(false)
        setMessage(
          'This password-reset link is missing, invalid, or expired. Request a new link.'
        )
      } else {
        setHasRecoverySession(true)
      }

      setCheckingSession(false)
    }

    verifyRecoverySession()

    return () => {
      mounted = false
    }
  }, [supabase])

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (!hasRecoverySession) {
      setMessage('Request a new password-reset link before continuing.')
      return
    }

    if (password.length < 8) {
      setMessage('Your new password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('The passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()

    router.replace('/login?passwordUpdated=true')
    router.refresh()
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-16">
        <section className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <p className="font-semibold text-blue-700">
            Verifying your password-reset link...
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-16">
      <section className="mx-auto max-w-md rounded-3xl border border-white/70 bg-white/95 p-7 shadow-xl sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
          Secure your account
        </p>

        <h1 className="mt-3 text-3xl font-bold text-blue-700">
          Choose a new password
        </h1>

        <p className="mt-4 text-sm leading-6 text-gray-600">
          Use at least 8 characters and choose a password you do not use
          elsewhere.
        </p>

        {hasRecoverySession ? (
          <form onSubmit={handleUpdate} className="mt-7 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">
                New password
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
                className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">
                Confirm new password
              </span>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
                className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
              />
            </label>

            <button
              disabled={loading}
              className="w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Updating password...' : 'Update Password'}
            </button>
          </form>
        ) : (
          <Link
            href="/forgot-password"
            className="mt-7 block rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700"
          >
            Request a New Reset Link
          </Link>
        )}

        {message ? (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  )
}
