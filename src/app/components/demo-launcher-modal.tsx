'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

// =============================================================================
// Demo roles
// =============================================================================

export type DemoRole =
  | 'customer'
  | 'business'
  | 'organization'

type DemoLaunchResponse = {
  ok?: boolean
  error?: string
  mode?: 'owner-preview' | 'demo-account'
  href?: string
}

export const DEMO_ROLES: {
  role: DemoRole
  title: string
  description: string
  icon: string
  color: string
}[] = [
  {
    role: 'customer',
    title: 'Customer',
    description:
      'Browse local deals, save offers, and support fundraisers in your community.',
    icon: '🛍️',
    color:
      'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50',
  },
  {
    role: 'business',
    title: 'Business',
    description:
      'Create offers, track redemptions, and grow local visibility.',
    icon: '🏪',
    color:
      'border-green-200 hover:border-green-400 hover:bg-green-50',
  },
  {
    role: 'organization',
    title: 'Organization',
    description:
      'Launch fundraising campaigns powered by local business deals.',
    icon: '🏫',
    color:
      'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  },
]

// =============================================================================
// Modal
// =============================================================================

export function DemoLauncherModal({
  onClose,
}: {
  onClose: () => void
}) {
  const router = useRouter()

  const [mounted, setMounted] =
    useState(false)

  const [launching, setLaunching] =
    useState<DemoRole | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  const panelRef =
    useRef<HTMLDivElement | null>(null)

  const closeButtonRef =
    useRef<HTMLButtonElement | null>(null)

  const previousFocusRef =
    useRef<HTMLElement | null>(null)

  // ===========================================================================
  // Mount and page-scroll control
  // ===========================================================================

  useEffect(() => {
    setMounted(true)

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [])

  // ===========================================================================
  // Focus management
  // ===========================================================================

  useEffect(() => {
    if (!mounted) {
      return
    }

    previousFocusRef.current =
      document.activeElement as HTMLElement

    closeButtonRef.current?.focus()

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) {
      return
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (
        event.key !== 'Tab' ||
        !panelRef.current
      ) {
        return
      }

      const focusable: HTMLElement[] = []

      panelRef.current
        .querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable], [tabindex]:not([tabindex="-1"])'
        )
        .forEach((element) => {
          if (element.offsetParent !== null) {
            focusable.push(element)
          }
        })

      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last =
        focusable[focusable.length - 1]

      if (event.shiftKey) {
        if (
          document.activeElement === first
        ) {
          event.preventDefault()
          last.focus()
        }

        return
      }

      if (
        document.activeElement === last
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [mounted, onClose])

  // ===========================================================================
  // Experience launch
  // ===========================================================================

  async function handleLaunch(
    role: DemoRole
  ) {
    setLaunching(role)
    setError(null)

    try {
      const response = await fetch(
        '/api/demo/login',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({ role }),
          credentials: 'same-origin',
        }
      )

      const result =
        (await response.json()) as DemoLaunchResponse

      if (!response.ok || result.error) {
        setError(
          result.error ??
            'Demo login failed. Please try again.'
        )

        setLaunching(null)
        return
      }

      const destination =
        result.href?.trim() || '/dashboard'

      onClose()
      router.push(destination)
      router.refresh()
    } catch {
      setError(
        'Unable to connect. Please try again.'
      )

      setLaunching(null)
    }
  }

  // ===========================================================================
  // Render through document body
  // ===========================================================================

  if (!mounted) {
    return null
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Explore demo experiences"
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8"
      onClick={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-blue-700">
            Choose Your Experience
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Explore RaiseHub as any of the
            following roles. No sign-up
            required.
          </p>
        </div>

        <div className="grid gap-4">
          {DEMO_ROLES.map(
            ({
              role,
              title,
              description,
              icon,
              color,
            }) => (
              <button
                key={role}
                type="button"
                disabled={launching !== null}
                onClick={() =>
                  handleLaunch(role)
                }
                className={`flex items-start gap-4 rounded-2xl border-2 bg-white p-5 text-left transition disabled:opacity-60 ${color}`}
              >
                <span
                  className="shrink-0 text-3xl"
                  aria-hidden="true"
                >
                  {icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-900">
                    {title}

                    {launching === role ? (
                      <span className="ml-2 text-sm font-normal text-blue-600">
                        Launching…
                      </span>
                    ) : null}
                  </span>

                  <span className="mt-1 block text-sm text-gray-600">
                    {description}
                  </span>
                </span>

                <span
                  className="mt-1 shrink-0 text-gray-400"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            )
          )}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close demo launcher"
          className="mt-6 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  )
}