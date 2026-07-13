'use client'

import { useState } from 'react'
import { DemoLauncherModal } from './demo-launcher-modal'

// =========================================
// DemoBannerCTA — exported component
// Drop this inside the DemoBanner `cta` slot from layout.tsx.
// =========================================

export default function DemoBannerCTA() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 sm:text-xs"
      >
        Explore Every Experience
      </button>

      {showModal ? (
        <DemoLauncherModal onClose={() => setShowModal(false)} />
      ) : null}
    </>
  )
}

