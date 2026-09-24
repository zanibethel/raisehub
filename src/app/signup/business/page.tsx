'use client'

import Link from 'next/link'
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

const partnershipFlow = [
  {
    number: '01',
    icon: '🏪',
    badge: 'FREE',
    title: 'Join RaiseHub free',
    description: 'Create your local business profile and publish up to three active offers.',
    accent: 'green',
  },
  {
    number: '02',
    icon: '🏷️',
    badge: 'YOUR OFFER',
    title: 'Create an offer customers want',
    description: 'Choose the value, redemption rules, and how customers use it at your business.',
    accent: 'blue',
  },
  {
    number: '03',
    icon: '🎟️',
    badge: 'LOCAL FUNDRAISING',
    title: 'Fundraisers sell RaiseHub passes',
    description: 'Schools, teams, nonprofits, and community groups sell passes filled with local offers like yours.',
    accent: 'amber',
  },
  {
    number: '04',
    icon: '📍',
    badge: 'NEW VISITS',
    title: 'Supporters discover your business',
    description: 'Pass holders find your offer, visit your business, and redeem through RaiseHub.',
    accent: 'violet',
  },
  {
    number: '05',
    icon: '↗',
    badge: 'PARTNER REWARDS',
    title: 'Grow your business & earn rewards',
    description: 'Track real activity and earn Partner Points for qualifying participation as your local reach grows.',
    accent: 'emerald',
  },
] as const

const rewardWays = [
  'Complete your profile',
  'Get verified',
  'Keep quality offers active',
  'Drive real redemptions',
  'Refer local businesses',
]

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
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-blue-50 px-3 py-8 text-gray-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">← Back to RaiseHub</Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="border-b border-green-100 bg-transparent px-1 pb-8 pt-2 sm:rounded-3xl sm:border sm:bg-white/95 sm:p-10 sm:shadow-xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">RaiseHub Community Partner</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-gray-900">Support your community while growing your business</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Offer a valuable local deal, reach supporters who want to shop local, and help schools, teams, nonprofits, and community groups build a fundraiser people actually want to buy.
            </p>

            <div className="mt-6 rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 via-yellow-50 to-green-50 p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">Founding 100 Bonus</span>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">2× Partner Points for 1 Year</span>
                <span className="rounded-full bg-green-700 px-3 py-1 text-xs font-black text-white">First 100 Verified Businesses</span>
              </div>
              <h2 className="mt-3 text-xl font-black text-slate-950">Join early. Earn double.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                The first 100 production businesses to become verified on RaiseHub automatically receive Founding Business status and earn 2× positive Partner Points for one year from verification.
              </p>
            </div>

            {referralToken ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                You were invited by a RaiseHub business partner. We&apos;ll remember this referral while you explore RaiseHub or the Business Demo and link it automatically when your business account is created.
              </div>
            ) : null}

            <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50/70 p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">How it works</p>
                  <h2 className="mt-2 text-2xl font-bold text-blue-800">From local offer to new customer</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                    Your offer helps make the fundraiser valuable. RaiseHub connects that value to local supporters and gives them a reason to walk through your door.
                  </p>
                </div>
                <a
                  href={businessDemoUrl}
                  className="shrink-0 rounded-xl border-2 border-blue-600 bg-white px-5 py-3 text-center text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Explore Business Demo →
                </a>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {partnershipFlow.map((step, index) => {
                  const accentClasses = {
                    green: 'border-green-200 bg-gradient-to-br from-green-50 to-white text-green-800',
                    blue: 'border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-800',
                    amber: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-800',
                    violet: 'border-violet-200 bg-gradient-to-br from-violet-50 to-white text-violet-800',
                    emerald: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-800',
                  }[step.accent]

                  return (
                    <article
                      key={step.number}
                      className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accentClasses} ${index === partnershipFlow.length - 1 ? 'sm:col-span-2' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm ring-1 ring-black/5" aria-hidden="true">
                            {step.icon}
                          </span>
                          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm ring-1 ring-black/5">
                            {step.badge}
                          </span>
                        </div>
                        <span className="text-3xl font-black leading-none opacity-20">{step.number}</span>
                      </div>
                      <h3 className="mt-5 text-lg font-black leading-snug text-slate-950">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                      {index < partnershipFlow.length - 1 ? (
                        <div className="mt-4 flex items-center gap-2 text-xs font-black uppercase tracking-wide opacity-60">
                          <span>Next step</span><span aria-hidden="true">→</span>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-black text-white">Track results</span>
                          <span className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-950">Earn Partner Points</span>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-green-50 p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Partner Rewards</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">Earn rewards as you help RaiseHub grow</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                RaiseHub Partners can earn Partner Points for qualifying activity that strengthens the community: building a complete profile, becoming verified, maintaining valuable offers, generating real customer activity, and referring other local businesses.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {rewardWays.map((way) => (
                  <span key={way} className="rounded-full border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm">
                    {way}
                  </span>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-gray-700">
                <strong className="text-gray-900">How Partner Points work:</strong>{' '}
                eligible Partner Points carry forward across quarters and can be used for available RaiseHub benefits. Quarterly activity may also qualify your business for a share of the Partner Rewards Pool. Partner Points do not have a fixed cash value, and reward eligibility depends on the applicable program rules.
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4"><p className="text-2xl font-bold text-green-700">3 Offers</p><p className="mt-1 text-sm text-gray-600">Free active offer allowance</p></div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-2xl font-bold text-blue-700">Local Reach</p><p className="mt-1 text-sm text-gray-600">Visibility with community supporters</p></div>
              <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4"><p className="text-2xl font-bold text-yellow-700">Shared Impact</p><p className="mt-1 text-sm text-gray-600">Better fundraising through better value</p></div>
            </div>

            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
              <strong className="text-gray-900">You are not being asked to donate money.</strong>{' '}
              Your contribution is the offer you choose to provide. RaiseHub handles the fundraising experience while your business gets visibility, customer traffic, redemption tracking, and access to Partner Rewards opportunities.
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-green-100 bg-white p-7 shadow-xl sm:p-8">
            <div className="flex flex-wrap gap-2"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">FOUNDING 100</span><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800">2× POINTS · 1 YEAR</span></div>
            <p className="mt-3 text-sm font-semibold text-green-700">Start free. Stay free.</p>
            <h2 className="mt-2 text-2xl font-bold text-blue-700">Become a RaiseHub Partner</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Create and manage up to 3 active offers with no required subscription. Upgrade only when you want additional offers or advanced features. After email confirmation, we will guide you through the complete business setup process.
            </p>

            <form onSubmit={handleSignup} className="mt-6 space-y-4">
              <div>
                <label htmlFor="business-signup-email" className="mb-2 block text-sm font-medium text-gray-700">Business email</label>
                <input id="business-signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.com" className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-green-500" required />
              </div>
              <div>
                <label htmlFor="business-signup-password" className="mb-2 block text-sm font-medium text-gray-700">Password</label>
                <input id="business-signup-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-green-500" required />
              </div>
              <button disabled={loading} className="w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white shadow transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? 'Creating account...' : 'Become a RaiseHub Partner'}
              </button>
            </form>

            {message ? <p className={`mt-4 text-sm ${message.startsWith('Account created') ? 'text-green-700' : 'text-red-600'}`}>{message}</p> : null}

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center">
              <p className="text-sm font-bold text-gray-900">Want to look around first?</p>
              <p className="mt-1 text-xs leading-5 text-gray-600">Open a sample business workspace with demo data. If you arrived through a business referral, RaiseHub keeps that attribution while you explore.</p>
              <a
                href={businessDemoUrl}
                className="mt-3 block w-full rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Explore Business Demo
              </a>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5 text-sm text-gray-600">
              <p>Already have an account? <Link href="/login?next=/workspace/new/business" className="font-semibold text-blue-700 hover:underline">Log in here</Link></p>
              <p className="mt-3">Looking for local deals? <Link href="/signup" className="font-semibold text-yellow-700 hover:underline">Customer signup →</Link></p>
              <p className="mt-3">Need to raise funds? <Link href="/signup/organization" className="font-semibold text-blue-700 hover:underline">Organization signup →</Link></p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
