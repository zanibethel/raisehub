'use client'

import { useEffect, useState } from 'react'

import AccountMenu from '@/app/components/account-menu'
import BusinessProfileForm from '@/app/components/business-profile-form'
import type { SelectableWorkspace } from '@/lib/types/identity-access'

type BusinessWorkspaceHeaderProps = {
  businessLegacyProfileId?: string | null
  businessName: string
  displayName: string
  phone: string
  address: string
  googleMapsUrl: string
  logoUrl: string
  websiteUrl: string
  subtitle: string
  badgeClass: string
  headingClass: string
  panelClass: string
  email: string | null
  workspaces: SelectableWorkspace[]
  selectedWorkspaceKey: string | null
}

export default function BusinessWorkspaceHeader({
  businessLegacyProfileId,
  businessName,
  displayName,
  phone,
  address,
  googleMapsUrl,
  logoUrl,
  websiteUrl,
  subtitle,
  badgeClass,
  headingClass,
  panelClass,
  email,
  workspaces,
  selectedWorkspaceKey,
}: BusinessWorkspaceHeaderProps) {
  const [editing, setEditing] = useState(false)
  const publicName = displayName || businessName || 'Business Dashboard'

  useEffect(() => {
    function openProfileFromHash() {
      if (window.location.hash === '#business-profile') {
        setEditing(true)
      }
    }

    openProfileFromHash()
    window.addEventListener('hashchange', openProfileFromHash)

    return () => {
      window.removeEventListener('hashchange', openProfileFromHash)
    }
  }, [])

  return (
    <header
      id="business-profile"
      className={`relative z-50 scroll-mt-6 overflow-visible rounded-[1.75rem] p-4 sm:p-6 ${panelClass}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div
          className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-bold sm:text-sm ${badgeClass}`}
        >
          Business
        </div>

        <div className="min-w-0 max-w-[72%] sm:max-w-md">
          <AccountMenu
            email={email}
            workspaces={workspaces}
            selectedWorkspaceKey={selectedWorkspaceKey}
          />
        </div>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:gap-5">
        <img
          src={logoUrl || '/default-business-logo.png'}
          alt={`${publicName} logo`}
          className="h-[4.75rem] w-[4.75rem] rounded-2xl border border-gray-200 bg-white object-contain p-1 shadow-sm sm:h-[5.5rem] sm:w-[5.5rem]"
        />

        <div className="min-w-0">
          <h1
            className={`break-words text-2xl font-black leading-tight sm:text-3xl ${headingClass}`}
          >
            {publicName}
          </h1>
          <p className="mt-1 text-sm font-semibold text-gray-700 sm:text-base">
            {subtitle}
          </p>
          {address ? (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500">
              <span aria-hidden="true">⌖ </span>
              {address}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          aria-expanded={editing}
          className="col-span-2 inline-flex min-h-10 items-center justify-center rounded-full border border-green-200 bg-green-50 px-5 text-sm font-bold text-green-700 transition hover:bg-green-100 sm:col-span-1 sm:justify-self-end"
        >
          {editing ? 'Close details' : 'Edit details'}
        </button>
      </div>

      {editing ? (
        <div className="mt-5 border-t border-green-100 pt-5">
          <BusinessProfileForm
            businessLegacyProfileId={businessLegacyProfileId}
            initialBusinessName={businessName}
            initialDisplayName={displayName}
            initialPhone={phone}
            initialAddress={address}
            initialGoogleMapsUrl={googleMapsUrl}
            initialLogoUrl={logoUrl}
            initialWebsiteUrl={websiteUrl}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : null}
    </header>
  )
}
