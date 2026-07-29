export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import LogoCarousel from '../components/logo-carousel'
import FeaturedDealsCarousel from '../components/featured-deals-carousel'
import CampaignProgressCarousel from '../components/campaign-progress-carousel'
import { getAppMode } from '@/lib/app-mode'
import { createClient } from '@/lib/supabase/server'

export default async function PlatformHomePage() {
  const supabase = await createClient()
  const appMode = getAppMode()
  const experienceHref = appMode === 'demo' ? 'https://raisehub.app/home' : 'https://demo.raisehub.app/home'
  const experienceLabel = appMode === 'demo' ? 'Go Live' : 'Enter Demo'

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-4 py-12 text-gray-900 sm:px-8 sm:py-16">
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-120px] h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute left-[-80px] top-[280px] h-[260px] w-[260px] rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-green-300/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl text-center">
        <p className="inline-flex rounded-full border border-blue-200 bg-white/85 px-4 py-1 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
          Fundraising powered by local businesses
        </p>

        <h1 className="mt-6 text-5xl font-bold tracking-tight text-blue-700 sm:text-6xl">
          RaiseHub
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-700">
          Raise money for schools and organizations while promoting local
          businesses. Supporters save locally, businesses gain visibility, and
          communities win together.
        </p>

        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-2 sm:gap-4">
          <Link
            href="/campaigns"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-2 py-3 text-center text-xs font-semibold leading-4 text-white shadow-lg transition hover:bg-blue-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-5 sm:text-base"
          >
            Browse Fundraisers
          </Link>

          <Link
            href="/signup?source=offers"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-green-600 px-2 py-3 text-center text-xs font-semibold leading-4 text-white shadow-lg transition hover:bg-green-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 sm:px-5 sm:text-base"
          >
            View Local Deals
          </Link>

          <Link
            href={experienceHref}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-yellow-300 bg-yellow-400 px-2 py-3 text-center text-xs font-semibold leading-4 text-slate-950 shadow-lg transition hover:bg-yellow-300 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-700 sm:px-5 sm:text-base"
          >
            {experienceLabel}
          </Link>
        </div>

        {user ? (
          <Link
            href="/dashboard"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-300 bg-white/90 px-5 py-2 text-sm font-medium text-blue-700 shadow-md transition hover:bg-white hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            View Dashboard
          </Link>
        ) : null}
      </div>

      <LogoCarousel />
      <FeaturedDealsCarousel />
      <CampaignProgressCarousel />

      <div className="mx-auto mt-16 max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-blue-700">Choose Your Path</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">RaiseHub works differently depending on your role. Find the path that fits you.</p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
            <h3 className="text-lg font-semibold text-blue-700">For schools &amp; organizations</h3>
            <p className="mt-2 flex-1 text-sm text-gray-600">Launch digital fundraising passes that supporters can buy online and use for months.</p>
            <Link href="/signup/organization" className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700">Start a Fundraiser</Link>
          </div>

          <div className="flex flex-col rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
            <h3 className="text-lg font-semibold text-green-700">For businesses</h3>
            <p className="mt-2 flex-1 text-sm text-gray-600">Promote local offers, attract new customers, and track redemption performance in one place.</p>
            <Link href="/signup/business" className="mt-4 inline-block rounded-xl bg-green-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-green-700">Join as a Business</Link>
          </div>

          <div className="flex flex-col rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur">
            <h3 className="text-lg font-semibold text-yellow-600">For supporters</h3>
            <p className="mt-2 flex-1 text-sm text-gray-600">Buy a pass, save money at local businesses, and help fund programs that matter.</p>
            <Link href="/signup?source=offers" className="mt-4 inline-block rounded-xl bg-yellow-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-yellow-700">View Local Deals</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl rounded-3xl border border-white/60 bg-white/85 p-8 shadow-xl backdrop-blur">
        <div className="grid gap-6 md:grid-cols-3">
          <div><p className="text-3xl font-bold text-blue-700">6 Months</p><p className="mt-2 text-sm text-gray-600">Reusable digital pass access for supporters</p></div>
          <div><p className="text-3xl font-bold text-green-700">Local Growth</p><p className="mt-2 text-sm text-gray-600">More visibility and foot traffic for participating businesses</p></div>
          <div><p className="text-3xl font-bold text-yellow-600">Shared Impact</p><p className="mt-2 text-sm text-gray-600">Schools, organizations, businesses, and families all benefit together</p></div>
        </div>
      </div>

      <footer className="mx-auto mt-16 max-w-5xl border-t border-blue-100 pt-6 text-center text-sm text-gray-500">
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/terms" className="hover:text-blue-700">Terms</Link>
          <Link href="/privacy" className="hover:text-blue-700">Privacy</Link>
          <Link href="/refund-policy" className="hover:text-blue-700">Refund Policy</Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} RaiseHub</p>
      </footer>
    </main>
  )
}
