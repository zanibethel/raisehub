'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

export default function GiftClaimAuth({ token }: { token: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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

    const claimPath = `/gifts/claim/${encodeURIComponent(token)}`
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
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={mode === 'signup' ? 8 : undefined}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3"
          />
        </label>
        <button
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-60"
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Log In and Continue' : 'Create Account and Continue'}
        </button>
      </form>

      {message ? (
        <p className={`mt-3 rounded-xl p-3 text-sm ${message.startsWith('Account created') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
