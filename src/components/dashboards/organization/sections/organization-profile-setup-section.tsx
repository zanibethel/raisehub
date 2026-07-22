'use client'

import { useState } from 'react'
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
  profile: OrganizationProfile
  isComplete: boolean
}

export default function OrganizationProfileSetupSection({
  profile,
  isComplete,
}: Props) {
  const [form, setForm] = useState(profile)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function updateField(
    field: keyof OrganizationProfile,
    value: string
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const result = await updateOrganizationProfileAction(form)
      setMessage(
        result.error ?? 'Organization profile saved. You can now create and manage fundraisers.'
      )
    } finally {
      setLoading(false)
    }
  }

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

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-700 sm:col-span-2">
          Organization name
          <input
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
          Town or city
          <input
            value={form.townName}
            onChange={(event) => updateField('townName', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            placeholder="Lubbock"
            required
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          State
          <input
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

          {message ? (
            <p
              className={`mt-3 text-sm ${
                message.startsWith('Organization profile saved')
                  ? 'text-green-700'
                  : 'text-red-700'
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  )
}
