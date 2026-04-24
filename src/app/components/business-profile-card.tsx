'use client'

import { useState } from 'react'
import BusinessProfileForm from './business-profile-form'

type BusinessProfileCardProps = {
  businessName: string
  phone: string
  address: string
  googleMapsUrl: string
  logoUrl?: string
  websiteUrl?: string
  displayName?: string
}

export default function BusinessProfileCard({
  businessName,
  phone,
  address,
  googleMapsUrl,
  logoUrl = '',
  websiteUrl = '',
  displayName = '',
}: BusinessProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  const publicName = displayName || businessName

  if (isEditing) {
    return (
      <BusinessProfileForm
        initialBusinessName={businessName}
        initialDisplayName={displayName}
        initialPhone={phone}
        initialAddress={address}
        initialGoogleMapsUrl={googleMapsUrl}
        initialWebsiteUrl={websiteUrl}
        initialLogoUrl={logoUrl}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
  src={logoUrl || '/default-business-logo.png'}
  alt={`${publicName || 'Business'} logo`}
  className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
/>

          <div>
            <h2 className="text-lg font-semibold text-green-700">
              Business Profile
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Customer-facing business details.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:border-green-600 hover:text-green-700"
        >
          Edit Profile
        </button>
      </div>

      <div className="mt-4 space-y-3 text-sm text-gray-700">
        <div>
          <p className="font-medium text-gray-900">Public Display Name</p>
          <p>{publicName || 'Not set yet'}</p>
        </div>

        <div>
          <p className="font-medium text-gray-900">Legal / Internal Business Name</p>
          <p>{businessName || 'Not set yet'}</p>
        </div>

        <div>
          <p className="font-medium text-gray-900">Phone</p>
          <p>{phone || 'Not set yet'}</p>
        </div>

        <div>
          <p className="font-medium text-gray-900">Address</p>
          <p>{address || 'Not set yet'}</p>
        </div>

        <div>
          <p className="font-medium text-gray-900">Website</p>
          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-green-700 underline"
            >
              Visit Website
            </a>
          ) : (
            <p>Not set yet</p>
          )}
        </div>

        <div>
          <p className="font-medium text-gray-900">Map Link</p>
          {googleMapsUrl ? (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-green-700 underline"
            >
              View Map
            </a>
          ) : (
            <p>Not set yet</p>
          )}
        </div>
      </div>
    </div>
  )
}