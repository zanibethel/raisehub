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
      className={`relative z-50 scroll-mt-6 rounded-3xl p-6 sm:p-8 ${panelClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`inline-flex shrink-0 rounded-full px-3 py-1 text-sm font-medium ${badgeClass}`}
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

      <div className="mt-6 flex items-center gap-4">
        <img
          src={logoUrl || '/default-business-logo.png'}
          alt={`${publicName} logo`}
          className="h-16 w-16 shrink-0 rounded-2xl border border-gray-200 object-cover shadow-sm sm:h-20 sm:w-20"
        />

        <div className="min-w-0 flex-1">
          <h1 className={`truncate text-3xl font-bold ${headingClass}`}>
            {publicName}
          </h1>
          <p className="mt-1 text-gray-600">{subtitle}</p>
          {address ? (
            <p className="mt-1 truncate text-sm text-gray-500">{address}</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setEditing((current) => !current)}
        aria-expanded={editing}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
      >
        {editing ? 'Close details' : 'Edit details'}
      </button>

      {editing ? (
        <div className="mt-6 border-t border-green-100 pt-6">
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
