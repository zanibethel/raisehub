'use client'

import { useState } from 'react'
import type { DemoOrganization } from '@/demo/organizations'

type OrganizationSelectorProps = {
  organizations: DemoOrganization[]
  title?: string
  description?: string
  onSelect?: (organization: DemoOrganization) => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function OrganizationSelector({
  organizations,
  title = 'Choose who your purchase supports',
  description = 'Select a local organization that is still working toward its goal.',
  onSelect,
}: OrganizationSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    organizations[0]?.id ?? null
  )

  function selectOrganization(organization: DemoOrganization) {
    setSelectedId(organization.id)
    onSelect?.(organization)
  }

  return (
    <section>
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-700">
          Every purchase has a purpose
        </p>

        <h2 className="mt-3 text-3xl font-bold text-blue-700 sm:text-4xl">
          {title}
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-gray-600">
          {description}
        </p>
      </div>

      <div className="mt-9 flex snap-x gap-5 overflow-x-auto pb-5">
        {organizations.map((organization) => {
          const progress =
            organization.goal > 0
              ? Math.min((organization.raised / organization.goal) * 100, 100)
              : 0

          const isSelected = selectedId === organization.id
          const amountRemaining = Math.max(
            organization.goal - organization.raised,
            0
          )

          return (
            <article
              key={organization.id}
              className={`min-w-[82%] snap-center rounded-3xl border bg-white p-6 shadow-lg transition sm:min-w-[360px] ${
                isSelected
                  ? 'border-green-500 ring-2 ring-green-200'
                  : 'border-blue-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    {organization.category}
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-gray-900">
                    {organization.name}
                  </h3>
                </div>

                {organization.badge ? (
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                    {organization.badge}
                  </span>
                ) : null}
              </div>

              <p className="mt-4 min-h-16 text-sm leading-6 text-gray-600">
                {organization.story}
              </p>

              <div className="mt-5">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-green-700">
                    {Math.round(progress)}% funded
                  </span>
                  <span className="text-gray-500">
                    {organization.daysRemaining} days left
                  </span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-green-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="font-bold text-blue-700">
                    {formatCurrency(organization.raised)}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    raised of {formatCurrency(organization.goal)}
                  </p>
                </div>

                <div className="rounded-xl bg-green-50 p-3">
                  <p className="font-bold text-green-700">
                    {organization.supporters}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">supporters</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-700">
                {formatCurrency(amountRemaining)} remaining
              </p>

              <button
                type="button"
                onClick={() => selectOrganization(organization)}
                className={`mt-5 w-full rounded-xl px-5 py-3 font-semibold transition ${
                  isSelected
                    ? 'bg-green-600 text-white'
                    : 'border border-green-200 bg-white text-green-700 hover:bg-green-50'
                }`}
              >
                {isSelected ? 'Selected ✓' : 'Support This Organization'}
              </button>
            </article>
          )
        })}
      </div>

      <p className="mt-2 text-center text-xs text-gray-500">
        Swipe to explore more organizations.
      </p>
    </section>
  )
}
