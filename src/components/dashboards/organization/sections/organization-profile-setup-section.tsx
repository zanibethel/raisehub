'use client'

import { useRef, useState } from 'react'
import {
  AUTHORIZATION_STATUS_OPTIONS,
  getAuthorizationStatusLabel,
  getOrganizationComplianceCompleteness,
  getTaxExemptStatusLabel,
  maskTaxIdLast4,
  ORGANIZATION_TYPE_OPTIONS,
  TAX_EXEMPT_STATUS_OPTIONS,
} from '@/lib/organizations/compliance-profile'
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
  legalEntityName: string
  taxIdLast4: string
  taxExemptStatus: string
  authorizationStatus: string
  authorizationContactName: string
  authorizationContactRole: string
  authorizationContactEmail: string
}

type Props = {
  organizationId: string
  profile: OrganizationProfile
  isComplete: boolean
}

function formatOrganizationType(value: string) {
  return value
    ? value
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Not set yet'
}

export default function OrganizationProfileSetupSection({
  organizationId,
  profile,
  isComplete,
}: Props) {
  const [form, setForm] = useState(profile)
  const [savedProfile, setSavedProfile] = useState(profile)
  const [complete, setComplete] = useState(isComplete)
  const [isEditing, setIsEditing] = useState(!isComplete)
  const [expanded, setExpanded] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const townInputRef = useRef<HTMLInputElement>(null)
  const stateInputRef = useRef<HTMLInputElement>(null)

  function updateField(field: keyof OrganizationProfile, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function returnToForm(errorMessage: string) {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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

      setSavedProfile(form)
      setComplete(true)
      setIsEditing(false)
      setExpanded(false)
      setMessage('Organization details saved.')
    } finally {
      setLoading(false)
    }
  }

  function cancelEditing() {
    setForm(savedProfile)
    setMessage('')
    setIsEditing(false)
  }

  const complianceCompleteness = getOrganizationComplianceCompleteness({
    organizationType: (isEditing ? form : savedProfile).organizationType,
    profile: {
      legalEntityName: (isEditing ? form : savedProfile).legalEntityName || null,
      taxIdLast4: (isEditing ? form : savedProfile).taxIdLast4 || null,
      taxExemptStatus: (isEditing ? form : savedProfile).taxExemptStatus || null,
      authorizationStatus: (isEditing ? form : savedProfile).authorizationStatus || null,
      authorizationContactName: (isEditing ? form : savedProfile).authorizationContactName || null,
      authorizationContactRole: (isEditing ? form : savedProfile).authorizationContactRole || null,
      authorizationContactEmail: (isEditing ? form : savedProfile).authorizationContactEmail || null,
      updatedAt: null,
    },
  })

  if (complete && !isEditing) {
    const location = [savedProfile.townName, savedProfile.stateCode]
      .filter(Boolean)
      .join(', ')

    return (
      <section
        id="organization-setup"
        className="rounded-2xl border border-green-100 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-5"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Organization details
              </p>
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                Setup complete
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                {complianceCompleteness.completed} of {complianceCompleteness.total} recommended details
              </span>
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold text-gray-950">
              {savedProfile.name || 'Organization profile'}
            </h2>
            <p className="mt-1 truncate text-sm text-gray-600">
              {location || formatOrganizationType(savedProfile.organizationType)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
          >
            {expanded ? 'Hide' : 'View'}
          </button>
        </div>

        {message ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {message}
          </p>
        ) : null}

        {expanded ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
              <div>
                <p className="font-medium text-gray-900">Organization type</p>
                <p>{formatOrganizationType(savedProfile.organizationType)}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Location</p>
                <p>{location || 'Not set yet'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Contact email</p>
                <p>{savedProfile.email || 'Not set yet'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Phone</p>
                <p>{savedProfile.phone || 'Not set yet'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Website</p>
                {savedProfile.websiteUrl ? (
                  <a href={savedProfile.websiteUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                    Visit website
                  </a>
                ) : (
                  <p>Not set yet</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className="font-medium text-gray-900">Short description</p>
                <p>{savedProfile.description || 'Not set yet'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Legal entity name</p>
                <p>{savedProfile.legalEntityName || 'Not provided'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Tax ID</p>
                <p>{maskTaxIdLast4(savedProfile.taxIdLast4 || null)}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Tax-exempt status</p>
                <p>{getTaxExemptStatusLabel(savedProfile.taxExemptStatus)}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Authorization status</p>
                <p>{getAuthorizationStatusLabel(savedProfile.authorizationStatus)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-medium text-gray-900">Authorization contact</p>
                <p>
                  {[savedProfile.authorizationContactName, savedProfile.authorizationContactRole, savedProfile.authorizationContactEmail]
                    .filter(Boolean)
                    .join(' · ') || 'Not provided'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMessage('')
                setIsEditing(true)
              }}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-700 sm:w-auto"
            >
              Edit organization details
            </button>
          </div>
        ) : null}
      </section>
    )
  }

  const isSuccess = message.startsWith('Organization details saved')

  return (
    <section
      id="organization-setup"
      className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Organization setup
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {complete ? 'Edit organization details' : 'Finish the basic organization setup'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Your town and state determine which managed RaiseHub pricing applies. These details also appear throughout campaign management and public fundraiser pages.
          </p>
        </div>

        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          {complete ? 'Editing' : 'Action required'}
        </span>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-6 scroll-mt-24 grid gap-4 sm:grid-cols-2">
        <p className="text-xs font-medium text-gray-600 sm:col-span-2">
          <span className="font-bold text-red-600" aria-hidden="true">*</span>{' '}
          Required fields
        </p>

        {message ? (
          <div role={isSuccess ? 'status' : 'alert'} aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm font-medium sm:col-span-2 ${isSuccess ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            {message}
          </div>
        ) : null}

        <label className="text-sm font-medium text-gray-700 sm:col-span-2">
          Organization name <span className="font-bold text-red-600" aria-hidden="true">*</span><span className="sr-only"> required</span>
          <input ref={nameInputRef} value={form.name} onChange={(event) => updateField('name', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500" placeholder="Westside Youth Baseball" required />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Organization type
          <select value={form.organizationType} onChange={(event) => updateField('organizationType', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500">
            <option value="">Choose a type</option>
            {ORGANIZATION_TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Contact email
          <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500" placeholder="contact@organization.org" />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Town or city <span className="font-bold text-red-600" aria-hidden="true">*</span><span className="sr-only"> required</span>
          <input ref={townInputRef} value={form.townName} onChange={(event) => updateField('townName', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500" placeholder="Lubbock" required />
        </label>

        <label className="text-sm font-medium text-gray-700">
          State <span className="font-bold text-red-600" aria-hidden="true">*</span><span className="sr-only"> required</span>
          <input ref={stateInputRef} value={form.stateCode} onChange={(event) => updateField('stateCode', event.target.value.toUpperCase().slice(0, 2))} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 uppercase outline-none focus:border-blue-500" placeholder="TX" maxLength={2} pattern="[A-Za-z]{2}" required />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Phone
          <input type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500" placeholder="(806) 555-0100" />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Website
          <input type="url" value={form.websiteUrl} onChange={(event) => updateField('websiteUrl', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500" placeholder="https://organization.org" />
        </label>

        <label className="text-sm font-medium text-gray-700 sm:col-span-2">
          Short description
          <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500" placeholder="Tell supporters what your organization does and what funds will support." />
        </label>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Optional compliance &amp; reporting details
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-950">
                {complianceCompleteness.completed} of {complianceCompleteness.total} recommended details complete
              </h3>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-800">
              Does not block creation or promotion
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-blue-950">
            Add these when they are available. RaiseHub can include them in campaign-ending reports,
            but missing values will not stop you from creating, sharing, or promoting a fundraiser.
            Payment or payout providers may still require their own verification before money can move.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 sm:col-span-2">
              Legal entity name
              <input value={form.legalEntityName} onChange={(event) => updateField('legalEntityName', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500" placeholder="Official organization name, when available" />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Tax-exempt status
              <select value={form.taxExemptStatus} onChange={(event) => updateField('taxExemptStatus', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500">
                <option value="">Choose when known</option>
                {TAX_EXEMPT_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              EIN / tax ID last four
              <input
                inputMode="numeric"
                value={form.taxIdLast4}
                onChange={(event) => updateField('taxIdLast4', event.target.value.replace(/\D/g, '').slice(0, 4))}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
                placeholder="1234"
                maxLength={4}
              />
              <span className="mt-1 block text-xs text-gray-500">
                RaiseHub only keeps the last four digits here for reporting; do not enter the full EIN.
              </span>
            </label>

            <label className="text-sm font-medium text-gray-700">
              School / organization authorization
              <select value={form.authorizationStatus} onChange={(event) => updateField('authorizationStatus', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500">
                <option value="">Choose when known</option>
                {AUTHORIZATION_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Authorization contact name
              <input value={form.authorizationContactName} onChange={(event) => updateField('authorizationContactName', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500" placeholder="Optional" />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Authorization contact role
              <input value={form.authorizationContactRole} onChange={(event) => updateField('authorizationContactRole', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500" placeholder="Principal, treasurer, sponsor…" />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Authorization contact email
              <input type="email" value={form.authorizationContactEmail} onChange={(event) => updateField('authorizationContactEmail', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500" placeholder="Optional" />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button type="submit" disabled={loading} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Saving organization...' : 'Save Organization Details'}
          </button>
          {complete ? (
            <button type="button" onClick={cancelEditing} disabled={loading} className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
