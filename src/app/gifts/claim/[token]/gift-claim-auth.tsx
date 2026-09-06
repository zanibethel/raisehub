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

export default function GiftClaimAuth({ token }: { token: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [message, setMessage] = useState('')

  const claimPath = `/gifts/claim/${encodeURIComponent(token)}`

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      window.location.reload()
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role: 'customer', signup_source: 'gift_claim' },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(claimPath)}`,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      window.location.reload()
      return
    }

    setMessage('Account created. Confirm your email, then this same gift link will return you here to claim your pass.')
    setLoading(false)
  }

  async function continueWithGoogle() {
    setOauthLoading(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(claimPath)}`,
      },
    })

    if (error) {
      setMessage(error.message)
      setOauthLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'signup' ? 'bg-emerald-700 text-white' : 'text-slate-600'}`}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            {mode === 'login' ? (
              <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Forgot password?
              </Link>
            ) : null}
          </div>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={mode === 'signup' ? 8 : undefined}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"
          />
        </label>
        <button
          disabled={loading || oauthLoading}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Log In and Continue' : 'Create Account and Continue'}
        </button>
      </form>

      {message ? (
        <p className={`mt-3 rounded-xl p-3 text-sm ${message.startsWith('Account created') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {message}
        </p>
      ) : null}

      <div className="my-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Or continue with
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={loading || oauthLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GoogleIcon />
        {oauthLoading ? 'Connecting...' : 'Google sign-in'}
      </button>

      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        You’ll return to this gift after authentication.
      </p>
    </div>
  )
}
