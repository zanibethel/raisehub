'use client'

import { useState } from 'react'
import BusinessProfileForm from './business-profile-form'

type BusinessProfileCardProps = {
  businessName: string
  phone: string
  address: string
  googleMapsUrl: string
}

export default function BusinessProfileCard({
  businessName,
  phone,
  address,
  googleMapsUrl,
}: BusinessProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <BusinessProfileForm
        initialBusinessName={businessName}
        initialPhone={phone}
        initialAddress={address}
        initialGoogleMapsUrl={googleMapsUrl}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-green-700">Business Profile</h2>
          <p className="mt-2 text-sm text-gray-600">
            Customer-facing business details.
          </p>
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
          <p className="font-medium text-gray-900">Business Name</p>
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