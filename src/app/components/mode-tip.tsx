'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Props = {
  label: string
  tone: 'blue' | 'green'
  children: ReactNode
}

export default function ModeTip({
  label,
  tone,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const container = containerRef.current
      if (!container) return
      if (!container.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const toneClasses =
    tone === 'blue'
      ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
      : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-black shadow-sm transition ${toneClasses}`}
      >
        i
      </button>

      {open ? (
        <div
          role="tooltip"
          className="absolute bottom-10 right-0 z-30 w-64 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs leading-5 text-slate-600 shadow-xl"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
