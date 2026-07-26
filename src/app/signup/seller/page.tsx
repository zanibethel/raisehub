'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SellerSignupPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaignId')?.trim() || ''
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const destination = campaignId
    ? `/seller/onboarding?campaignId=${encodeURIComponent(campaignId)}`
    : '/seller/onboarding'

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'customer',
          seller_intent: true,
          seller_display_name: displayName.trim(),
          seller_campaign_id: campaignId || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      window.location.href = destination
      return
    }

    setMessage(
      campaignId
        ? 'Account created. Check your email to confirm your account, then continue joining the organization and choosing your roster name.'
        : 'Account created. Check your email to confirm your account, then continue setting up your seller profile.'
    )
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-5 py-10 text-gray-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">← Back to RaiseHub</Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-blue-100 bg-white/95 p-7 shadow-xl sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">RaiseHub Sellers</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">Sell for a fundraiser without starting one yourself.</h1>
            <p className="mt-5 text-lg leading-8 text-gray-600">
              {campaignId
                ? 'This organizer link will connect your seller profile to the organization after you confirm your account. Then you can choose your name from its campaign roster.'
                : 'Create one seller profile, join an organization, choose your name from its roster, and keep the same seller identity across future campaigns.'}
            </p>

            {campaignId ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-900">
                Organizer-linked signup detected. You will not need to search for the organization manually.
              </div>
            ) : null}

            <div className="mt-8 space-y-4">
              {[
                ['1', 'Create your seller profile', 'Use your own name and account.'],
                ['2', campaignId ? 'Join the organization automatically' : 'Join an organization', campaignId ? 'This organizer link carries the campaign connection for you.' : 'Accept an invitation or organization join link.'],
                ['3', 'Choose your roster name', 'Link your profile to the correct campaign seller entry.'],
                ['4', 'Share your link or QR', 'Sales stay credited to your existing roster record.'],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{number}</div>
                  <div><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-gray-600">{description}</p></div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
              Sellers do not need to create or manage campaigns. Your organization handles the fundraiser while you focus on sharing and tracking your progress.
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-blue-100 bg-white p-7 shadow-xl sm:p-8">
            <p className="text-sm font-semibold text-blue-700">Get started</p>
            <h2 className="mt-2 text-2xl font-bold">Create a Seller Account</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">After confirming your email, RaiseHub will create your reusable seller profile and guide you to the correct organization roster.</p>

            <form onSubmit={handleSignup} className="mt-6 space-y-4">
              <div>
                <label htmlFor="seller-name" className="mb-2 block text-sm font-medium text-gray-700">Display name</label>
                <input id="seller-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label htmlFor="seller-email" className="mb-2 block text-sm font-medium text-gray-700">Email</label>
                <input id="seller-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label htmlFor="seller-password" className="mb-2 block text-sm font-medium text-gray-700">Password</label>
                <input id="seller-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500" required />
              </div>
              <button disabled={loading} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-50">{loading ? 'Creating account...' : 'Create Seller Account'}</button>
            </form>

            {message ? <p className={`mt-4 text-sm ${message.startsWith('Account created') ? 'text-green-700' : 'text-red-600'}`}>{message}</p> : null}

            <div className="mt-6 border-t border-gray-200 pt-5 text-sm text-gray-600">
              Already have an account? <Link href={`/login?next=${encodeURIComponent(destination)}`} className="font-semibold text-blue-700 hover:underline">Log in here</Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
