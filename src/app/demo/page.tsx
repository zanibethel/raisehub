'use client'

import Link from 'next/link'
import { useState } from 'react'

import { DEMO_ROLES, type DemoRole } from '@/app/components/demo-launcher-modal'

type DemoLaunchResponse = {
  error?: string
  href?: string
}

export default function InteractiveDemoPage() {
  const [launching, setLaunching] = useState<DemoRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function launch(role: DemoRole) {
    setLaunching(role)
    setError(null)

    try {
      const response = await fetch('/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ role }),
      })
      const result = (await response.json()) as DemoLaunchResponse

      if (!response.ok || result.error) {
        setError(result.error ?? 'The Interactive Demo could not be launched.')
        setLaunching(null)
        return
      }

      window.location.assign(result.href?.trim() || '/dashboard')
    } catch {
      setError('The Interactive Demo could not be reached. Please try again.')
      setLaunching(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 px-4 py-10 text-gray-900 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-green-200 bg-white p-6 shadow-xl sm:p-10">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">RaiseHub · Interactive Demo</p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Choose a role to explore</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              You&apos;re exploring RaiseHub using sample data. Nothing here affects live organizations, and no real payment will be initiated.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {DEMO_ROLES.map(({ role, title, description, icon }) => (
              <button
                key={role}
                type="button"
                onClick={() => launch(role)}
                disabled={launching !== null}
                className="rounded-2xl border-2 border-green-100 bg-white p-5 text-left transition hover:border-green-400 hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="text-3xl" aria-hidden="true">{icon}</span>
                <span className="mt-4 block text-lg font-bold text-gray-900">{title}</span>
                <span className="mt-2 block text-sm leading-6 text-gray-600">{description}</span>
                <span className="mt-4 block text-sm font-semibold text-green-700">
                  {launching === role ? 'Launching…' : `Explore as ${title}`}
                </span>
              </button>
            ))}
          </div>

          {error ? (
            <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col justify-center gap-3 border-t border-gray-100 pt-6 sm:flex-row">
            <Link href="https://raisehub.app" className="rounded-xl border border-blue-200 px-5 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
              Switch to Live Platform
            </Link>
            <Link href="https://raisehub.app" className="rounded-xl px-5 py-3 text-center text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700">
              Return to Experience Selection
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
