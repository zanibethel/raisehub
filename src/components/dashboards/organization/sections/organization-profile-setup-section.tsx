'use client'

import { useRef, useState } from 'react'
import { updateOrganizationProfileAction } from '../organization-profile-actions'

type OrganizationProfile = {
  name: string
  organizationType: string
  description: string
  phone: string
  email: string
  websiteUrl: string
  townName: string
  stateCode: string
}

type Props = {
  organizationId: string
  profile: OrganizationProfile
  isComplete: boolean
}

export default function OrganizationProfileSetupSection({
  organizationId,
  profile,
  isComplete,
}: Props) {
  const [form, setForm] = useState(profile)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const townInputRef = useRef<HTMLInputElement>(null)
  const stateInputRef = useRef<HTMLInputElement>(null)

  function updateField(
    field: keyof OrganizationProfile,
    value: string
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function returnToForm(errorMessage: string) {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })

      if (!form.name.trim()) {
        nameInputRef.current?.focus({ preventScroll: true })
        return
      }

      if (!form.townName.trim()) {
        townInputRef.current?.focus({ preventScroll: true })
        return
      }

      if (!/^[A-Za-z]{2}$/.test(form.stateCode.trim())) {
        stateInputRef.current?.focus({ preventScroll: true })
        return
      }

      if (errorMessage.toLowerCase().includes('state')) {
        stateInputRef.current?.focus({ preventScroll: true })
        return
      }

      if (errorMessage.toLowerCase().includes('town')) {
        townInputRef.current?.focus({ preventScroll: true })
        return
      }

      nameInputRef.current?.focus({ preventScroll: true })
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const result = await updateOrganizationProfileAction({
        organizationId,
        ...form,
      })

      if (result.error) {
        setMessage(result.error)
        returnToForm(result.error)
        return
      }

      setMessage(
        'Organization profile saved. You can now create and manage fundraisers.'
      )
    } finally {
      setLoading(false)
    }
  }

  const isSuccess = message.startsWith('Organization profile saved')

  return (
    <section
      id="organization-setup"
      className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${
        isComplete
          ? 'border-green-200 bg-green-50/70'
          : 'border-amber-200 bg-amber-50/80'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Organization setup
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {isComplete ? 'Organization details' : 'Finish setup before launching'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Your town and state determine which managed RaiseHub pricing applies. These
            details also appear throughout campaign management and public fundraiser pages.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isComplete
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {isComplete ? 'Setup complete' : 'Action required'}
        </span>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-6 scroll-mt-24 grid gap-4 sm:grid-cols-2"
      >
        <p className="text-xs font-medium text-gray-600 sm:col-span-2">
          <span className="font-bold text-red-600" aria-hidden="true">*</span>{' '}
          Required fields
        </p>

        {message ? (
          <div
            role={isSuccess ? 'status' : 'alert'}
            aria-live="polite"
            className={`rounded-xl border px-4 py-3 text-sm font-medium sm:col-span-2 ${
              isSuccess
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message}
          </div>
        ) : null}

        <label className="text-sm font-medium text-gray-700 sm:col-span-2">
          Organization name{' '}
          <span className="font-bold text-red-600" aria-hidden="true">*</span>
          <span className="sr-only"> required</span>
          <input
            ref={nameInputRef}
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            placeholder="Westside Youth Baseball"
            required
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Organization type
          <select
            value={form.organizationType}
            onChange={(event) => updateField('organizationType', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
          >
            <option value="">Choose a type</option>
            <option value="school">School</option>
            <option value="sports_team">Sports team</option>
            <option value="nonprofit">Nonprofit</option>
            <option value="club">Club</option>
            <option value="church">Church</option>
            <option value="community_group">Community group</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Contact email
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            placeholder="contact@organization.org"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Town or city{' '}
          <span className="font-bold text-red-600" aria-hidden="true">*</span>
          <span className="sr-only"> required</span>
          <input
            ref={townInputRef}
            value={form.townName}
            onChange={(event) => updateField('townName', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            placeholder="Lubbock"
            required
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          State{' '}
          <span className="font-bold text-red-600" aria-hidden="true">*</span>
          <span className="sr-only"> required</span>
          <input
            ref={stateInputRef}
            value={form.stateCode}
            onChange={(event) =>
              updateField('stateCode', event.target.value.toUpperCase().slice(0, 2))
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 uppercase outline-none focus:border-blue-500"
            placeholder="TX"
            maxLength={2}
            pattern="[A-Za-z]{2}"
            required
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Phone
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => updateField('phone', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            placeholder="(806) 555-0100"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Website
          <input
            type="url"
            value={form.websiteUrl}
            onChange={(event) => updateField('websiteUrl', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            placeholder="https://organization.org"
          />
        </label>

        <label className="text-sm font-medium text-gray-700 sm:col-span-2">
          Short description
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            className="mt-2 min-h-28 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            placeholder="Tell supporters what your organization does and what funds will support."
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Saving organization...' : 'Save Organization Details'}
          </button>
        </div>
      </form>
    </section>
  )
}
