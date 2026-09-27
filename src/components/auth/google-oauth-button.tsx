'use client'

import { useState } from 'react'

import { getSafeInternalPath } from '@/lib/navigation/safe-internal-path'
import { createClient } from '@/lib/supabase/client'

type Props = {
  destination: string
  label?: string
  disabled?: boolean
}

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

export default function GoogleOAuthButton({
  destination,
  label = 'Continue with Google',
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleGoogleOAuth() {
    setLoading(true)
    setMessage('')

    const next = getSafeInternalPath(destination)
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGoogleOAuth}
        disabled={disabled || loading}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GoogleIcon />
        {loading ? 'Connecting...' : label}
      </button>

      {message ? (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  )
}
