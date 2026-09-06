'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const NAVIGATION_TIMEOUT_MS = 10_000

export default function NotificationRouteOverlayCleanup() {
  const pathname = usePathname()
  const [navigationPending, setNavigationPending] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const closeButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Close notifications"]'
    )

    closeButton?.click()
    setNavigationPending(false)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [pathname])

  useEffect(() => {
    function clearPending() {
      setNavigationPending(false)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    function beginPending() {
      setNavigationPending(true)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(clearPending, NAVIGATION_TIMEOUT_MS)
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      let destination: URL
      try {
        destination = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      if (destination.origin !== window.location.origin) return

      const current = new URL(window.location.href)
      const sameDocument =
        destination.pathname === current.pathname &&
        destination.search === current.search

      if (sameDocument) return

      beginPending()
    }

    document.addEventListener('click', handleDocumentClick, true)
    window.addEventListener('pageshow', clearPending)
    window.addEventListener('popstate', clearPending)

    return () => {
      document.removeEventListener('click', handleDocumentClick, true)
      window.removeEventListener('pageshow', clearPending)
      window.removeEventListener('popstate', clearPending)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (!navigationPending) return null

  return (
    <div
      className="fixed inset-0 z-[120] cursor-wait"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading next page"
    >
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-blue-100/80">
        <div className="raisehub-navigation-progress h-full w-1/3 bg-blue-600" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(5.5rem,env(safe-area-inset-bottom))] flex justify-center px-4 sm:bottom-6">
        <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-white/95 px-4 py-2 text-sm font-bold text-blue-700 shadow-lg backdrop-blur">
          <span
            className="raisehub-spinner h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-600"
            aria-hidden="true"
          />
          Loading…
        </div>
      </div>
    </div>
  )
}
