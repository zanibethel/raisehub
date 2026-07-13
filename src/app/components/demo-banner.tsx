// =========================================
// 🧭 DEMO BANNER
// Renders only when the app is running in demo mode
// (NEXT_PUBLIC_APP_MODE=demo). Returns null otherwise,
// so production renders nothing here at all.
//
// The `cta` slot accepts a React node for the primary
// call-to-action area so interactive demo launchers
// can be rendered as client components without
// restructuring this server component.
// =========================================

import { isDemoMode } from '@/lib/app-mode'

type DemoBannerProps = {
  cta?: React.ReactNode
}

export default function DemoBanner({ cta }: DemoBannerProps) {
  if (!isDemoMode()) {
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
