// =========================================
// 🧭 DEMO BANNER
// Renders only when the app is running in demo mode
// (NEXT_PUBLIC_APP_MODE=demo). Returns null otherwise,
// so production renders nothing here at all.
//
// The action area (buttons like "Build My RaiseHub")
// is optional and configurable via the `actions` prop,
// so future actions (e.g. "Schedule a Demo", "Watch Tour")
// can be added later without restructuring this component.
// =========================================

import Link from 'next/link'
import { isDemoMode } from '@/lib/app-mode'

export type DemoBannerAction = {
  label: string
  href: string
}

type DemoBannerProps = {
  actions?: DemoBannerAction[]
}

// Default action shown when no `actions` prop is provided.
// Points at production onboarding for now — update this href
// once demo.raisehub.com and raisehub.com are separate domains.
const DEFAULT_ACTIONS: DemoBannerAction[] = [
  { label: 'Build My RaiseHub', href: '/signup' },
]

export default function DemoBanner({ actions = DEFAULT_ACTIONS }: DemoBannerProps) {
  if (!isDemoMode()) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 z-50 w-full bg-blue-600 px-3 py-2 text-center text-white shadow-sm sm:px-4">
      <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-3">
        <div>
          <p className="text-xs font-medium sm:text-sm">
            This is the RaiseHub Interactive Demo.
          </p>
          <p className="text-[11px] text-blue-100 sm:text-xs">
            Businesses shown are demonstration data.
          </p>
        </div>

        {actions.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:mt-0">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 sm:text-xs"
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
