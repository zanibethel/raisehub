'use client'

import {
  useEffect,
  useState,
} from 'react'

import { createClient } from '@/lib/supabase/client'

import BusinessProfileForm from './business-profile-form'

// =============================================================================
// Types
// =============================================================================

type BusinessProfileCardProps = {
  businessName: string
  phone: string
  address: string
  googleMapsUrl: string
  businessLegacyProfileId?: string | null
  logoUrl?: string
  websiteUrl?: string
  displayName?: string
}

type BusinessLocationStatus = {
  latitude: number | null
  longitude: number | null
  locationSource: string | null
  locationUpdatedAt: string | null
}

type LocationLoadStatus =
  | 'loading'
  | 'ready'
  | 'missing'
  | 'error'

// =============================================================================
// Display helpers
// =============================================================================

function formatLocationSource(
  source: string | null
): string {
  if (source === 'current_location') {
    return 'Current device location'
  }

  if (source === 'google_place') {
    return 'Google business listing'
  }

  if (source === 'manual') {
    return 'Manually confirmed location'
  }

  return 'Confirmed business location'
}

function formatUpdatedDate(
  value: string | null
): string {
  if (!value) {
    return 'Update date unavailable'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Update date unavailable'
  }

  return `Updated ${date.toLocaleDateString()}`
}

// =============================================================================
// Component
// =============================================================================

export default function BusinessProfileCard({
  businessName,
  phone,
  address,
  googleMapsUrl,
  businessLegacyProfileId,
  logoUrl = '',
  websiteUrl = '',
  displayName = '',
}: BusinessProfileCardProps) {
  const [isEditing, setIsEditing] =
    useState(false)

  const [
    locationLoadStatus,
    setLocationLoadStatus,
  ] = useState<LocationLoadStatus>(
    'loading'
  )

  const [
    businessLocation,
    setBusinessLocation,
  ] = useState<BusinessLocationStatus | null>(
    null
  )

  const publicName =
    displayName || businessName

  useEffect(() => {
    let isMounted = true

    async function loadBusinessLocation() {
      setLocationLoadStatus('loading')
      setBusinessLocation(null)

      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!isMounted) {
        return
      }

      if (!user) {
        setLocationLoadStatus('error')
        return
      }

      const resolvedBusinessProfileId =
        businessLegacyProfileId?.trim() ||
        user.id

      const {
        data: business,
        error,
      } = await supabase
        .from('businesses')
        .select(
          'latitude, longitude, location_source, location_updated_at'
        )
        .eq(
          'legacy_profile_id',
          resolvedBusinessProfileId
        )
        .maybeSingle()

      if (!isMounted) {
        return
      }

      if (error) {
        setLocationLoadStatus('error')
        return
      }

      const hasCoordinates =
        typeof business?.latitude ===
          'number' &&
        typeof business?.longitude ===
          'number'

      if (!hasCoordinates) {
        setBusinessLocation(null)
        setLocationLoadStatus('missing')
        return
      }

      setBusinessLocation({
        latitude:
          business.latitude,
        longitude:
          business.longitude,
        locationSource:
          business.location_source,
        locationUpdatedAt:
          business.location_updated_at,
      })

      setLocationLoadStatus('ready')
    }

    void loadBusinessLocation()

    return () => {
      isMounted = false
    }
  }, [businessLegacyProfileId])

  if (isEditing) {
    return (
      <BusinessProfileForm
        initialBusinessName={
          businessName
        }
        initialDisplayName={
          displayName
        }
        initialPhone={phone}
        initialAddress={address}
        initialGoogleMapsUrl={
          googleMapsUrl
        }
        initialWebsiteUrl={
          websiteUrl
        }
        initialLogoUrl={logoUrl}
        onCancel={() =>
          setIsEditing(false)
        }
      />
    )
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={
              logoUrl ||
              '/default-business-logo.png'
            }
            alt={`${
              publicName || 'Business'
            } logo`}
            className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
          />

          <div>
            <h2 className="text-lg font-semibold text-green-700">
              Business Profile
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Customer-facing business
              details.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsEditing(true)
          }
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-green-600 hover:text-green-700"
        >
          Edit Profile &amp; Location
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="text-2xl"
          >
            📍
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Nearby Offer Location
            </p>

            {locationLoadStatus ===
            'loading' ? (
              <p className="mt-1 text-sm text-blue-800">
                Checking location
                readiness…
              </p>
            ) : null}

            {locationLoadStatus ===
              'ready' &&
            businessLocation ? (
              <>
                <p className="mt-1 font-semibold text-green-800">
                  Location saved for
                  nearby offers
                </p>

                <p className="mt-1 text-sm text-blue-800">
                  {formatLocationSource(
                    businessLocation.locationSource
                  )}
                  {' · '}
                  {formatUpdatedDate(
                    businessLocation.locationUpdatedAt
                  )}
                </p>

                <p className="mt-2 text-xs text-blue-700">
                  Customers who share
                  their location can see
                  approximate distance to
                  this business.
                </p>
              </>
            ) : null}

            {locationLoadStatus ===
            'missing' ? (
              <>
                <p className="mt-1 font-semibold text-orange-800">
                  Exact location not
                  saved
                </p>

                <p className="mt-1 text-sm text-blue-800">
                  Add the written address
                  and select Use My
                  Current Location while
                  at the business.
                </p>
              </>
            ) : null}

            {locationLoadStatus ===
            'error' ? (
              <>
                <p className="mt-1 font-semibold text-red-700">
                  Location status could
                  not be loaded
                </p>

                <p className="mt-1 text-sm text-blue-800">
                  Reopen this page or use
                  Edit Profile &amp;
                  Location to confirm the
                  business location.
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm text-gray-700 sm:grid-cols-2">
        <div>
          <p className="font-medium text-gray-900">
            Public Display Name
          </p>

          <p>
            {publicName ||
              'Not set yet'}
          </p>
        </div>

        <div>
          <p className="font-medium text-gray-900">
            Legal / Internal Business
            Name
          </p>

          <p>
            {businessName ||
              'Not set yet'}
          </p>
        </div>

        <div>
          <p className="font-medium text-gray-900">
            Phone
          </p>

          <p>
            {phone || 'Not set yet'}
          </p>
        </div>

        <div>
          <p className="font-medium text-gray-900">
            Address
          </p>

          <p>
            {address || 'Not set yet'}
          </p>
        </div>

        <div>
          <p className="font-medium text-gray-900">
            Website
          </p>

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
          <p className="font-medium text-gray-900">
            Map Link
          </p>

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