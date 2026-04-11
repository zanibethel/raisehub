'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('customer')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role, // 👈 THIS gets picked up by the trigger
        },
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Account created. You can now log in.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#F0F6FF] p-8">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-blue-600">
          Create your account
        </h1>

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
            required
          />

          <select
            className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="customer">Customer</option>
            <option value="business">Business</option>
            <option value="organization">Organization</option>
          </select>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-green-600">{message}</p>
        )}
      </div>
    </main>
  )
}