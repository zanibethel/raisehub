'use client'

import Link from 'next/link'
import GoogleOAuthButton from '@/components/auth/google-oauth-button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  clearBusinessReferralInBrowser,
  normalizeBusinessReferralToken,
  readBusinessReferralCookie,
  rememberBusinessReferralInBrowser,
} from '@/lib/referrals/business-referral'
import { createClient } from '@/lib/supabase/client'

const BUSINESS_DEMO_URL = 'https://raisehub-demo.vercel.app/demo?role=business'

export default function BusinessSignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const searchReferralToken = normalizeBusinessReferralToken(searchParams.get('ref')) ?? ''

  const [referralToken, setReferralToken] = useState(searchReferralToken)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const rememberedToken = readBusinessReferralCookie(document.cookie)
    const resolvedToken = searchReferralToken || rememberedToken || ''

    if (searchReferralToken) rememberBusinessReferralInBrowser(searchReferralToken)
    if (resolvedToken) setReferralToken(resolvedToken)
  }, [searchReferralToken])

  useEffect(() => {
    let cancelled = false

    async function routeExistingAccount() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) return

      const destination = referralToken
        ? `/workspace/new/business?ref=${encodeURIComponent(referralToken)}`
        : '/workspace/new/business'

      router.replace(destination)
    }

    void routeExistingAccount()
    return () => { cancelled = true }
  }, [referralToken, router, supabase])

  const businessDemoUrl = referralToken
    ? `${BUSINESS_DEMO_URL}&ref=${encodeURIComponent(referralToken)}`
    : BUSINESS_DEMO_URL

  const googleDestination = referralToken
    ? `/workspace/new/business?ref=${encodeURIComponent(referralToken)}`
    : '/workspace/new/business'

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const destination = '/onboarding/business'
    const rememberedToken = referralToken || readBusinessReferralCookie(document.cookie) || ''
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          role: 'business',
          ...(rememberedToken ? { business_referral: rememberedToken } : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    // The referral token is now durable in auth metadata and the database claim
    // trigger. Clear the browser copy so it cannot accidentally follow a later
    // unrelated business setup on this device.
    if (rememberedToken) clearBusinessReferralInBrowser()

    if (data.session) {
      window.location.href = destination
      return
    }

    setMessage('Account created. Check your email to confirm your account, then continue setting up your business.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">← Back to RaiseHub</Link>

        <header className="mt-7 max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">RaiseHub for local businesses</p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            You provide the offer. We help customers discover you.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
            Join RaiseHub for free, create an offer you&apos;re comfortable with, and let local fundraisers introduce customers to your business.
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-green-800">
            No selling fundraising passes, recruiting participants, or organizing fundraisers required.
          </p>
        </header>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <aside className="order-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:order-2 lg:sticky lg:top-6">
            <p className="text-sm font-bold text-green-700">Free to join · Up to 3 active offers</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Create your business profile</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              No required subscription. You can upgrade later if you want more offers or advanced features.
            </p>
            {referralToken ? (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                You were invited by a RaiseHub business partner. We&apos;ll remember your referral when you join.
              </p>
            ) : null}
            <div className="mt-5">
              <GoogleOAuthButton destination={googleDestination} disabled={loading} />
            </div>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase text-slate-500">Or sign up with email</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label htmlFor="business-signup-email" className="mb-2 block text-sm font-medium text-slate-700">Business email</label>
                <input id="business-signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.com" className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100" required />
              </div>
              <div>
                <label htmlFor="business-signup-password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <input id="business-signup-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100" required />
              </div>
              <button disabled={loading} className="min-h-12 w-full rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Creating account...' : 'Create My Free Business Profile'}
              </button>
            </form>
            {message ? <p role="status" className={message.startsWith('Account created') ? 'mt-4 text-sm text-green-700' : 'mt-4 text-sm text-red-600'}>{message}</p> : null}
            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-sm font-bold text-slate-950">Want to look around first?</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Explore the business demo before creating an account.</p>
              <a href={businessDemoUrl} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 hover:bg-blue-100">
                Explore Business Demo
              </a>
            </div>
            <p className="mt-5 text-sm text-slate-600">Already have an account? <Link href="/login?next=/workspace/new/business" className="font-semibold text-blue-700 hover:underline">Log in</Link></p>
          </aside>

          <section className="order-2 lg:order-1">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Three simple steps</h2>
            <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              <article className="flex gap-4 py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 font-black text-green-800">1</span>
                <div>
                  <h3 className="text-lg font-black">Sign up free</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Create your business profile so local customers can find you.</p>
                </div>
              </article>
              <article className="flex gap-4 py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-800">2</span>
                <div>
                  <h3 className="text-lg font-black">Add your offers</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Choose the discounts, perks, and redemption rules that work for your business.</p>
                </div>
              </article>
              <article className="flex gap-4 py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 font-black text-amber-800">3</span>
                <div>
                  <h3 className="text-lg font-black">Welcome customers</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Local organizations sell fundraising passes. Supporters discover your offers and can visit your business to redeem them.</p>
                </div>
              </article>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-700">
              <strong>What&apos;s your commitment?</strong> There&apos;s no obligation to donate money or run a fundraiser. Simply keep your offers accurate and honor valid redemptions under the terms you choose.
            </p>

            <details className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer text-base font-black text-slate-950">Optional partner rewards and benefits</summary>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <p><strong>Founding 100:</strong> The first 100 verified production businesses receive 2× positive Partner Points for one year after verification.</p>
                <p><strong>Partner Rewards:</strong> Eligible activity, including profile completion, verification, active offers, redemptions, and business referrals, can earn Partner Points. Points have no fixed cash value; eligibility for rewards and the quarterly pool follows program rules.</p>
                <p><strong>Growth options:</strong> Start with up to three active offers for free. Optional upgrades add offer capacity and advanced features.</p>
              </div>
            </details>
          </section>
        </div>
      </div>
    </main>
  )
}
