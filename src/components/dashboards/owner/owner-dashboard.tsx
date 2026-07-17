import Link from 'next/link'

import { getOwnerPlatformAnalytics } from '@/lib/services/owner-platform-analytics-service'

import OwnerDashboardContent from './owner-dashboard-content'

export type PreviewRole =
  | 'customer'
  | 'business'
  | 'organization'
  | 'admin'

type Props = {
  searchParams?: {
    previewRole?: string
  }
}

export default async function OwnerDashboard(
  _props: Props
) {
  const platformAnalyticsResult =
    await getOwnerPlatformAnalytics()

  const platformMetrics =
    platformAnalyticsResult.status === 'success'
      ? platformAnalyticsResult.metrics
      : null

  return (
    <>
      <OwnerDashboardContent
        platformMetrics={platformMetrics}
      />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Platform settings
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-950">
              Pricing
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Manage platform defaults, overrides, scheduled changes, and pricing history.
            </p>
          </div>

          <Link
            href="/dashboard/owner/pricing"
            className="inline-flex w-fit shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Open pricing
            <span
              aria-hidden="true"
              className="ml-2"
            >
              →
            </span>
          </Link>
        </div>
      </section>
    </>
  )
}
