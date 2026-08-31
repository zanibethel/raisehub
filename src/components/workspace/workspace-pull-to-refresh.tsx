'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, type ReactNode, type TouchEvent } from 'react'

type Props = {
  children: ReactNode
}

const PULL_START_TOLERANCE = 4
const REFRESH_THRESHOLD = 72
const MAX_PULL_DISTANCE = 112

export default function WorkspacePullToRefresh({ children }: Props) {
  const router = useRouter()
  const startY = useRef<number | null>(null)
  const tracking = useRef(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  function resetPull() {
    startY.current = null
    tracking.current = false
    setPullDistance(0)
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (refreshing || event.touches.length !== 1 || window.scrollY > PULL_START_TOLERANCE) {
      resetPull()
      return
    }

    startY.current = event.touches[0]?.clientY ?? null
    tracking.current = startY.current !== null
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!tracking.current || startY.current === null || event.touches.length !== 1) return

    const currentY = event.touches[0]?.clientY ?? startY.current
    const rawDistance = currentY - startY.current

    if (rawDistance <= 0 || window.scrollY > PULL_START_TOLERANCE) {
      resetPull()
      return
    }

    // Add resistance so the UI follows the finger without feeling loose.
    const resistedDistance = Math.min(rawDistance * 0.58, MAX_PULL_DISTANCE)
    setPullDistance(resistedDistance)
  }

  function handleTouchEnd() {
    if (!tracking.current) {
      resetPull()
      return
    }

    const shouldRefresh = pullDistance >= REFRESH_THRESHOLD && !refreshing

    resetPull()

    if (!shouldRefresh) return

    setRefreshing(true)
    router.refresh()

    // router.refresh() does not expose a completion promise. Keep the feedback
    // visible long enough to make the gesture feel acknowledged, then release it.
    window.setTimeout(() => {
      setRefreshing(false)
    }, 850)
  }

  const progress = Math.min(pullDistance / REFRESH_THRESHOLD, 1)
  const indicatorVisible = refreshing || pullDistance > 6
  const ready = pullDistance >= REFRESH_THRESHOLD

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetPull}
      className="relative min-h-full"
    >
      <div
        aria-hidden={!indicatorVisible}
        className={`pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] -translate-x-1/2 transition-all duration-150 ${
          indicatorVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      >
        <div className="flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-bold text-slate-700 shadow-lg backdrop-blur">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[11px] ${
              refreshing ? 'animate-spin' : ''
            }`}
            style={refreshing ? undefined : { transform: `rotate(${Math.round(progress * 180)}deg)` }}
          >
            ↻
          </span>
          <span>{refreshing ? 'Refreshing…' : ready ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      </div>

      {children}
    </div>
  )
}
