'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type PreviewRole =
  | 'customer'
  | 'business'
  | 'organization'

type OwnerRoleSwitcherProps = {
  activeRole: PreviewRole
}

const roleOptions: {
  value: PreviewRole
  label: string
  description: string
}[] = [
  {
    value: 'customer',
    label: 'Supporter',
    description: 'Passes, saved offers, campaign support, and redemptions',
  },
  {
    value: 'business',
    label: 'Business',
    description: 'Offers, analytics, redemptions, and profile tools',
  },
  {
    value: 'organization',
    label: 'Organization',
    description: 'Campaigns, sellers, earnings, and reports',
  },
]

export default function OwnerRoleSwitcher({
  activeRole,
}: OwnerRoleSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function selectRole(role: PreviewRole) {
    const params = new URLSearchParams(searchParams.toString())

    params.set('previewRole', role)
    params.delete('subject')

    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Switch role
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          View another side of this scenario
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          The selected demo group remains active. Choose a linked profile after switching roles.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {roleOptions.map((option) => {
          const isActive = option.value === activeRole

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => selectRole(option.value)}
              aria-pressed={isActive}
              className={`rounded-xl border p-4 text-left transition ${
                isActive
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <span
                className={`block font-bold ${
                  isActive ? 'text-blue-800' : 'text-slate-900'
                }`}
              >
                {option.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                {option.description}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Preview mode never changes your saved Owner role or signs you into the selected demo account.
      </p>
    </section>
  )
}
