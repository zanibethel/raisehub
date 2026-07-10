'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const validRoles = ['customer', 'business', 'organization'] as const

type Role = (typeof validRoles)[number]

function getInitialRole(roleParam: string | null): Role {
  if (roleParam && validRoles.includes(roleParam as Role)) {
    return roleParam as Role
  }

  return 'customer'
}

export default function SignupForm() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(() =>
    getInitialRole(searchParams.get('role'))
  )
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      window.location.href =
        role === 'business' ? '/onboarding/business' : '/dashboard'
      return
    }

    setMessage(
      'Account created. Check your email to confirm your account before logging in.'
    )
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-7 shadow-md sm:p-8">
      <p className="text-sm font-semibold text-green-700">
        Free to get started
      </p>

      <h1 className="mt-2 text-2xl font-bold text-blue-600">
        Create your RaiseHub account
      </h1>

      <p className="mt-3 text-sm leading-6 text-gray-600">
        Businesses can create up to 3 exclusive offers for free and support
        local organizations on every plan.
      </p>

      <form onSubmit={handleSignup} className="mt-6 space-y-4">
        <input
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        <select
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="customer">Customer / Supporter</option>
          <option value="business">Business</option>
          <option value="organization">Organization</option>
        </select>

        <button
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create Free Account'}
        </button>
      </form>

      {message ? (
        <p
          className={`mt-4 text-sm ${
            message.startsWith('Account created')
              ? 'text-green-700'
              : 'text-red-600'
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
