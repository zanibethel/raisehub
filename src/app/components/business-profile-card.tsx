'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BusinessProfileForm from './business-profile-form'

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

type LocationLoadStatus = 'loading' | 'ready' | 'missing' | 'error'

function formatLocationSource(source: string | null): string {
  if (source === 'current_location') return 'Current device location'
  if (source === 'google_place') return 'Google business listing'
  if (source === 'manual') return 'Manually confirmed location'
  return 'Confirmed business location'
}

function formatUpdatedDate(value: string | null): string {
  if (!value) return 'Update date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Update date unavailable'
  return `Updated ${date.toLocaleDateString()}`
}

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
  const [isEditing, setIsEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [locationLoadStatus, setLocationLoadStatus] =
    useState<LocationLoadStatus>('loading')
  const [businessLocation, setBusinessLocation] =
    useState<BusinessLocationStatus | null>(null)

  const publicName = displayName || businessName

  useEffect(() => {
    let isMounted = true

    async function loadBusinessLocation() {
      setLocationLoadStatus('loading')
      setBusinessLocation(null)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!isMounted) return

      if (!user) {
        setLocationLoadStatus('error')
        return
      }

      const resolvedBusinessProfileId =
        businessLegacyProfileId?.trim() || user.id

      const { data: business, error } = await supabase
        .from('businesses')
        .select('latitude, longitude, location_source, location_updated_at')
        .eq('legacy_profile_id', resolvedBusinessProfileId)
        .maybeSingle()

      if (!isMounted) return

      if (error) {
        setLocationLoadStatus('error')
        return
      }

      const hasCoordinates =
        typeof business?.latitude === 'number' &&
        typeof business?.longitude === 'number'

      if (!hasCoordinates) {
        setLocationLoadStatus('missing')
        return
      }

      setBusinessLocation({
        latitude: business.latitude,
        longitude: business.longitude,
        locationSource: business.location_source,
        locationUpdatedAt: business.location_updated_at,
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
        businessLegacyProfileId={businessLegacyProfileId}
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

  const locationSummary =
    locationLoadStatus === 'ready' && businessLocation
      ? `${formatLocationSource(businessLocation.locationSource)} · ${formatUpdatedDate(
          businessLocation.locationUpdatedAt
        )}`
      : locationLoadStatus === 'missing'
        ? 'Exact nearby-offer location is not saved'
        : locationLoadStatus === 'error'
          ? 'Location status could not be loaded'
          : 'Checking location readiness…'

  return (
    <section className="rounded-2xl border border-green-100 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={logoUrl || '/default-business-logo.png'}
            alt={`${publicName || 'Business'} logo`}
            className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 object-cover"
          />

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
              Business details
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-gray-950">
              {publicName || 'Business profile'}
            </h2>
            <p className="mt-1 truncate text-sm text-gray-600">
              {address || phone || 'Profile details not completed'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="shrink-0 rounded-full bg-green-50 px-3 py-2 text-sm font-semibold text-green-700"
        >
          {expanded ? 'Hide' : 'View'}
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Nearby offer location
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {locationLoadStatus === 'ready'
                ? 'Location saved for nearby offers'
                : locationLoadStatus === 'missing'
                  ? 'Location needs attention'
                  : locationLoadStatus === 'error'
                    ? 'Location unavailable'
                    : 'Checking location'}
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-800">
              {locationSummary}
            </p>
          </div>

          <div className="mt-4 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
            <div>
              <p className="font-medium text-gray-900">Public name</p>
              <p>{publicName || 'Not set yet'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Legal name</p>
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
              <p className="font-medium text-gray-900">Map link</p>
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

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-green-600 hover:text-green-700 sm:w-auto"
          >
            Edit Profile &amp; Location
          </button>
        </div>
      ) : null}
    </section>
  )
}
