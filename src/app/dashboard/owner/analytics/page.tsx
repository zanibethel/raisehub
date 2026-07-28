import Link from 'next/link'
import { redirect } from 'next/navigation'

import AnalyticsWorkspace from './analytics-workspace'
import { getOwnerPlatformAnalytics } from '@/lib/services/owner-platform-analytics-service'

export const metadata = {
  title: 'Analytics | RaiseHub Owner Console',
}

export default async function OwnerAnalyticsPage() {
  const result = await getOwnerPlatformAnalytics()

  if (result.status === 'unauthenticated') {
    redirect('/login')
  }

  if (result.status === 'owner-role-required') {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-900"
          >
            <span aria-hidden="true">←</span>
            Owner dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Platform Intelligence
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Analytics
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Track platform scale, active content, and operational conditions that need your attention.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              <span aria-hidden="true">▣</span>
              Owner only
            </span>
          </div>
        </header>

        {result.status === 'metrics-lookup-failure' ? (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-bold text-amber-950">
              Analytics unavailable
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              RaiseHub could not load the current platform metrics. Return to the dashboard and try again after the next refresh.
            </p>
          </section>
        ) : (
          <AnalyticsWorkspace metrics={result.metrics} />
        )}
      </div>
    </main>
  )
}
