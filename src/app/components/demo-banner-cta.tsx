'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// =========================================
// Demo Roles
// =========================================

type DemoRole = 'customer' | 'business' | 'organization'

const DEMO_ROLES: {
  role: DemoRole
  title: string
  description: string
  icon: string
  color: string
}[] = [
  {
    role: 'customer',
    title: 'Customer',
    description: 'Browse local deals, save offers, and support fundraisers in your community.',
    icon: '🛍️',
    color: 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50',
  },
  {
    role: 'business',
    title: 'Business',
    description: 'Create offers, track redemptions, and grow local visibility.',
    icon: '🏪',
    color: 'border-green-200 hover:border-green-400 hover:bg-green-50',
  },
  {
    role: 'organization',
    title: 'Organization',
    description: 'Launch fundraising campaigns powered by local business deals.',
    icon: '🏫',
    color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  },
]

// =========================================
// Demo Launcher Modal
// =========================================

function DemoLauncherModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [launching, setLaunching] = useState<DemoRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleLaunch(role: DemoRole) {
    setLaunching(role)
    setError(null)

    try {
      const res = await fetch('/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
        credentials: 'same-origin',
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error ?? 'Demo login failed. Please try again.')
        setLaunching(null)
        return
      }

      onClose()
      router.push('/dashboard')
    } catch {
      setError('Unable to connect. Please try again.')
      setLaunching(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Explore demo experiences"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-blue-700">
            Choose Your Experience
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Explore RaiseHub as any of the following roles. No sign-up required.
          </p>
        </div>

        <div className="grid gap-4">
          {DEMO_ROLES.map(({ role, title, description, icon, color }) => (
            <button
              key={role}
              type="button"
              disabled={launching !== null}
              onClick={() => handleLaunch(role)}
              className={`flex items-start gap-4 rounded-2xl border-2 bg-white p-5 text-left transition disabled:opacity-60 ${color}`}
            >
              <span className="text-3xl" aria-hidden="true">
                {icon}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {title}
                  {launching === role ? (
                    <span className="ml-2 text-sm font-normal text-blue-600">
                      Launching…
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              </div>
              <span className="mt-1 text-gray-400" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  )
}

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
