'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BUSINESS_DEMO_URL = 'https://raisehub-demo.vercel.app/demo?role=business'

const partnershipFlow = [
  {
    number: '01',
    title: 'Join RaiseHub free',
    description:
      'Create your Community Partner profile and publish up to three active offers with no required subscription.',
  },
  {
    number: '02',
    title: 'Create an offer customers want',
    description:
      'Choose the discount, redemption rules, and how customers will redeem it at your business.',
  },
  {
    number: '03',
    title: 'Local organizations sell RaiseHub passes',
    description:
      'Schools, teams, nonprofits, and community groups fundraise by selling passes filled with valuable local offers like yours.',
  },
  {
    number: '04',
    title: 'Supporters discover and visit your business',
    description:
      'Pass holders can find your offer, visit your business, and redeem it using the supported QR or manual redemption flow.',
  },
  {
    number: '05',
    title: 'Track results & earn Partner Points',
    description:
      'See offer activity and redemptions while earning Partner Points for qualifying participation. Your Rewards Center shows what you have earned and what you can do next.',
  },
]

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
  const referralToken = searchParams.get('ref')?.trim() ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function routeExistingAccount() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!cancelled && user) router.replace('/workspace/new/business')
    }

    void routeExistingAccount()
    return () => { cancelled = true }
  }, [router, supabase])

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const destination = '/onboarding/business'
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'business',
          ...(referralToken ? { business_referral: referralToken } : {}),
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

    setMessage('Account created. Check your email to confirm your account, then continue setting up your business.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 px-5 py-10 text-gray-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">← Back to RaiseHub</Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-green-100 bg-white/95 p-7 shadow-xl sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">RaiseHub Community Partner</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-gray-900">Support your community while growing your business</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Offer a valuable local deal, reach supporters who want to shop local, and help schools, teams, nonprofits, and community groups build a fundraiser people actually want to buy.
            </p>

            {referralToken ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                You were invited by a RaiseHub business partner. Your signup will be linked to their referral automatically.
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
                  href={BUSINESS_DEMO_URL}
                  className="shrink-0 rounded-xl border-2 border-blue-600 bg-white px-5 py-3 text-center text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Explore Business Demo →
                </a>
              </div>

              <div className="mt-7 space-y-0">
                {partnershipFlow.map((step, index) => (
                  <div key={step.number} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < partnershipFlow.length - 1 ? (
                      <div className="absolute left-[19px] top-10 h-[calc(100%-2rem)] w-px bg-green-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white shadow-sm">
                      {step.number}
                    </div>
                    <div className="min-w-0 pt-1">
                      <h3 className="font-bold text-gray-900">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{step.description}</p>
                    </div>
                  </div>
                ))}
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
                use eligible points for available RaiseHub benefits, or keep them toward your share of the quarterly Partner Rewards Pool. Partner Points do not have a fixed cash value, and reward eligibility depends on the applicable program rules.
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
            <p className="text-sm font-semibold text-green-700">Start free. Stay free.</p>
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
              <p className="mt-1 text-xs leading-5 text-gray-600">Open a sample business workspace with demo data. Nothing you do there affects live businesses.</p>
              <a
                href={BUSINESS_DEMO_URL}
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
