'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function NotificationRouteOverlayCleanup() {
  const pathname = usePathname()

  useEffect(() => {
    const closeButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Close notifications"]'
    )

    closeButton?.click()
  }, [pathname])

  return null
}
