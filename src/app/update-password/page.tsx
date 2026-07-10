'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function verifySession() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMessage(
          'This password-reset link is missing, invalid, or expired. Request a new link.'
        )
      }

      setCheckingSession(false)
    }

    verifySession()
  }, [supabase])

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

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
    router.push('/login?passwordUpdated=true')
    router.refresh()
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-16">
        <p className="text-center text-gray-600">
          Verifying your reset link...
        </p>
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

        {message ? (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  )
}
