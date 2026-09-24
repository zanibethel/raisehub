export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'

import CampaignProgressCarousel from '../components/campaign-progress-carousel'
import FeaturedDealsCarousel from '../components/featured-deals-carousel'
import LogoCarousel from '../components/logo-carousel'
import { getAppMode } from '@/lib/app-mode'
import { createClient } from '@/lib/supabase/server'

export default async function PlatformHomePage() {
  const supabase = await createClient()
  const appMode = getAppMode()
  const experienceHref =
    appMode === 'demo'
      ? 'https://raisehub.app/home'
      : 'https://demo.raisehub.app/home'
  const experienceLabel = appMode === 'demo' ? 'Go Live' : 'Enter Demo'

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F7FAFC] px-4 pb-8 text-slate-950 sm:px-8 sm:pb-12">
      <div className="absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-blue-300/35 blur-3xl" />
        <div className="absolute left-[-120px] top-[180px] h-[300px] w-[300px] rounded-full bg-green-300/20 blur-3xl" />
        <div className="absolute right-[-100px] top-[280px] h-[280px] w-[280px] rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <section className="mx-auto max-w-6xl pt-8 sm:pt-16">
        <div className="overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-2xl sm:px-10 sm:py-12">
          <div className="relative">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/25 blur-2xl" />
            <div className="absolute -bottom-24 right-20 h-56 w-56 rounded-full bg-green-400/15 blur-2xl" />

            <div className="relative z-10 max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                Fundraising powered by local businesses
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                Fundraise locally.
                <span className="block text-green-300">Reward supporters.</span>
                Grow together.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                RaiseHub connects community fundraisers, local businesses, and supporters through digital passes filled with valuable local offers.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                <Link
                  href="/campaigns"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-4 text-center text-sm font-black text-white shadow-lg transition hover:bg-blue-500"
                >
                  Browse Fundraisers
                </Link>

                <Link
                  href="/offers"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-green-600 px-4 text-center text-sm font-black text-white shadow-lg transition hover:bg-green-500"
                >
                  View Local Deals
                </Link>

                <Link
                  href={experienceHref}
                  className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15 sm:min-h-12"
                >
                  {experienceLabel}
                </Link>
              </div>

              {user ? (
                <Link
                  href="/dashboard"
                  className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-black text-blue-200 hover:text-white"
                >
                  Open my dashboard <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <LogoCarousel />
      <CampaignProgressCarousel />
      <FeaturedDealsCarousel />

      <section className="mx-auto mt-14 max-w-6xl sm:mt-20">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            Choose Your Path
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            One community, three ways to participate
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Start a fundraiser, bring your business into the network, or support a campaign and unlock local savings.
          </p>
        </div>

        <div className="-mr-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pr-4 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
          <article style={{ flex: '0 0 min(82vw, 360px)' }} className="flex shrink-0 snap-start flex-col rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-xl font-black text-blue-700">
              ↑
            </span>
            <h3 className="mt-5 text-lg font-black text-slate-950">Schools &amp; organizations</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
              Launch digital fundraising passes supporters can buy online and use at participating businesses.
            </p>
            <Link
              href="/signup/organization"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
            >
              Start a Fundraiser
            </Link>
          </article>

          <article style={{ flex: '0 0 min(82vw, 360px)' }} className="flex shrink-0 snap-start flex-col rounded-3xl border border-green-100 bg-white p-5 shadow-sm sm:p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-xl font-black text-green-700">
              ↗
            </span>
            <h3 className="mt-5 text-lg font-black text-slate-950">Local businesses</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
              Publish offers, attract new customers, support local fundraising, and earn Partner Points.
            </p>
            <Link
              href="/signup/business"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-green-600 px-4 text-sm font-black text-white hover:bg-green-700"
            >
              Join as a Business
            </Link>
          </article>

          <article style={{ flex: '0 0 min(82vw, 360px)' }} className="flex shrink-0 snap-start flex-col rounded-3xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-xl font-black text-amber-700">
              ♥
            </span>
            <h3 className="mt-5 text-lg font-black text-slate-950">Supporters</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
              Support a fundraiser, activate your pass, and save at businesses participating in the RaiseHub community.
            </p>
            <Link
              href="/campaigns"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-4 text-sm font-black text-slate-950 hover:bg-amber-400"
            >
              Find a Fundraiser
            </Link>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl border-y border-slate-200 py-8 sm:mt-20 sm:py-10">
        <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
          <div className="px-2 sm:px-6">
            <p className="text-xl font-black text-blue-700 sm:text-3xl">6 Months</p>
            <p className="mt-2 text-[11px] leading-4 text-slate-500 sm:text-sm">
              Reusable supporter pass access
            </p>
          </div>
          <div className="px-2 sm:px-6">
            <p className="text-xl font-black text-green-700 sm:text-3xl">Local Growth</p>
            <p className="mt-2 text-[11px] leading-4 text-slate-500 sm:text-sm">
              Visibility and customer traffic
            </p>
          </div>
          <div className="px-2 sm:px-6">
            <p className="text-xl font-black text-amber-600 sm:text-3xl">Shared Impact</p>
            <p className="mt-2 text-[11px] leading-4 text-slate-500 sm:text-sm">
              Fundraisers and businesses win together
            </p>
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-10 max-w-6xl pt-4 text-center text-sm text-slate-500">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/terms" className="hover:text-blue-700">Terms</Link>
          <Link href="/privacy" className="hover:text-blue-700">Privacy</Link>
          <Link href="/refund-policy" className="hover:text-blue-700">Refund Policy</Link>
          <Link href="/schools" className="hover:text-blue-700">Schools</Link>
          <Link href="/schools/it-access" className="hover:text-blue-700">School IT Access</Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} RaiseHub</p>
      </footer>
    </main>
  )
}
