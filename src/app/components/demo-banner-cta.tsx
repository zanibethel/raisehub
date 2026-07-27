'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { DemoLauncherModal } from './demo-launcher-modal'

// =========================================
// DemoBannerCTA — exported component
// Drop this inside the DemoBanner `cta` slot from layout.tsx.
// =========================================

export default function DemoBannerCTA() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showModal, setShowModal] = useState(false)

  const isLiveHandoff =
    pathname === '/go-live' || searchParams.get('live') === '1'

  if (isLiveHandoff) {
    return (
      <Link
        href="/"
        className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 sm:text-xs"
      >
        Back to Demo Experience
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 sm:text-xs"
      >
        Explore Every Experience
      </button>

      <Link
        href="/go-live"
        className="rounded-full border border-white/70 bg-blue-950/25 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-950/40 sm:text-xs"
      >
        Go Live
      </Link>

      {showModal ? (
        <DemoLauncherModal onClose={() => setShowModal(false)} />
      ) : null}
    </>
  )
}
