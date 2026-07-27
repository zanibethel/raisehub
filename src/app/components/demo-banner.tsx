'use client'

import { usePathname, useSearchParams } from 'next/navigation'

// =========================================
// 🧭 DEMO BANNER
//
// Root layout decides whether the current visitor is in a public demo
// presentation. This client component handles route-specific handoffs so
// production campaign browsing can look and feel fully live even while the
// demo and production domains still share one deployment.
// =========================================

type DemoBannerProps = {
  cta?: React.ReactNode
}

export default function DemoBanner({ cta }: DemoBannerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isLiveCampaignPage =
    pathname.startsWith('/campaigns') &&
    searchParams.get('live') === '1'

  if (isLiveCampaignPage) {
    return null
  }

  return (
    <div className="relative z-50 w-full bg-blue-600 px-3 py-3 text-center text-white shadow-sm sm:px-4 sm:py-2">
      <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-3">
        <div>
          <p className="text-xs font-medium sm:text-sm">
            This is the RaiseHub Interactive Demo.
          </p>
          <p className="text-[11px] text-blue-100 sm:text-xs">
            Businesses shown are demonstration data.
          </p>
        </div>

        {cta ? (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:mt-0">
            {cta}
          </div>
        ) : null}
      </div>
    </div>
  )
}
