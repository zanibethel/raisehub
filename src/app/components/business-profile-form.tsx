'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

// =============================================================================
// Types
// =============================================================================

type BusinessProfileFormProps = {
  initialBusinessName: string
  initialPhone: string
  initialAddress: string
  initialGoogleMapsUrl: string
  initialLogoUrl?: string
  initialWebsiteUrl?: string
  initialDisplayName?: string
  onCancel?: () => void
}

type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'

type CapturedLocation = {
  latitude: number
  longitude: number
}

// =============================================================================
// Location helpers
// =============================================================================

function getLocationStatusMessage(
  status: LocationStatus
): string {
  if (status === 'requesting') {
    return 'Waiting for your device to share its location.'
  }

  if (status === 'ready') {
    return 'Location captured. Select Save Profile to use it for nearby offers.'
  }

  if (status === 'denied') {
    return 'Location access was denied. Allow location access in your browser settings and try again.'
  }

  if (status === 'unavailable') {
    return 'Your current location could not be determined. Check your device location settings and try again.'
  }

  if (status === 'timeout') {
    return 'The location request took too long. Try again when your device has a stronger location signal.'
  }

  if (status === 'unsupported') {
    return 'This browser does not support location access. You can still enter the business address manually.'
  }

  return 'Use this while you are physically at the business location.'
}

function getLocationErrorStatus(
  error: GeolocationPositionError
): LocationStatus {
  if (
    error.code ===
    GeolocationPositionError.PERMISSION_DENIED
  ) {
    return 'denied'
  }

  if (
    error.code ===
    GeolocationPositionError.POSITION_UNAVAILABLE
  ) {
    return 'unavailable'
  }

  if (
    error.code ===
    GeolocationPositionError.TIMEOUT
  ) {
    return 'timeout'
  }

  return 'unavailable'
}

// =============================================================================
// Component
// =============================================================================

export default function BusinessProfileForm({
  initialBusinessName,
  initialPhone,
  initialAddress,
  initialGoogleMapsUrl,
  initialLogoUrl = '',
  initialWebsiteUrl = '',
  initialDisplayName = '',
  onCancel,
}: BusinessProfileFormProps) {
  const supabase = createClient()

  const [businessName, setBusinessName] =
    useState(initialBusinessName)

  const [displayName, setDisplayName] =
    useState(initialDisplayName)

  const [phone, setPhone] =
    useState(initialPhone)

  const [address, setAddress] =
    useState(initialAddress)

  const [googleMapsUrl, setGoogleMapsUrl] =
    useState(initialGoogleMapsUrl)

  const [websiteUrl, setWebsiteUrl] =
    useState(initialWebsiteUrl)

  const [logoUrl, setLogoUrl] =
    useState(initialLogoUrl)

  const [logoFile, setLogoFile] =
    useState<File | null>(null)

  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>('idle')

  const [capturedLocation, setCapturedLocation] =
    useState<CapturedLocation | null>(null)

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const isRequestingLocation =
    locationStatus === 'requesting'

  const hasCapturedLocation =
    locationStatus === 'ready' &&
    capturedLocation !== null

  // ===========================================================================
  // Logo actions
  // ===========================================================================

  async function handleRemoveLogo() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Not authenticated')
      setLoading(false)
      return
    }

    if (logoUrl) {
      const path = logoUrl.split('/logos/')[1]

      if (path) {
        await supabase.storage
          .from('logos')
          .remove([path])
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        logo_url: null,
      })
      .eq('id', user.id)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('legacy_profile_id', user.id)
      .maybeSingle()

    if (business) {
      await supabase
        .from('businesses')
        .update({
          logo_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', business.id)
    }

    setLogoUrl('')
    setLogoFile(null)
    setMessage('Logo removed')
    setLoading(false)
  }

  async function uploadLogo(userId: string) {
    if (!logoFile) {
      return logoUrl
    }

    const fileExt =
      logoFile.name.split('.').pop()

    const filePath =
      `businesses/${userId}-${Date.now()}.${fileExt}`

    const { error: uploadError } =
      await supabase.storage
        .from('logos')
        .upload(filePath, logoFile, {
          upsert: true,
        })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  // ===========================================================================
  // Location actions
  // ===========================================================================

  function requestCurrentLocation() {
    setMessage('')

    if (!navigator.geolocation) {
      setCapturedLocation(null)
      setLocationStatus('unsupported')
      return
    }

    setLocationStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCapturedLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })

        setLocationStatus('ready')
      },
      (error) => {
        setCapturedLocation(null)
        setLocationStatus(
          getLocationErrorStatus(error)
        )
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      }
    )
  }

  function clearCapturedLocation() {
    setCapturedLocation(null)
    setLocationStatus('idle')
  }

  // ===========================================================================
  // Save
  // ===========================================================================

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Not authenticated')
      setLoading(false)
      return
    }

    try {
      const uploadedLogoUrl =
        await uploadLogo(user.id)

      const now = new Date().toISOString()

      const { error: profileError } =
        await supabase
          .from('profiles')
          .update({
            business_name: businessName,
            display_name: displayName,
            phone,
            address,
            google_maps_url: googleMapsUrl,
            website_url: websiteUrl,
            logo_url:
              uploadedLogoUrl || null,
          })
          .eq('id', user.id)

      if (profileError) {
        throw new Error(profileError.message)
      }

      const { data: business, error: businessLookupError } =
        await supabase
          .from('businesses')
          .select('id')
          .eq('legacy_profile_id', user.id)
          .maybeSingle()

      if (businessLookupError) {
        throw new Error(
          businessLookupError.message
        )
      }

      if (business) {
        const businessUpdate = {
          name: businessName,
          phone: phone || null,
          address: address || null,
          website_url: websiteUrl || null,
          logo_url: uploadedLogoUrl || null,
          updated_at: now,
          ...(capturedLocation
            ? {
                latitude:
                  capturedLocation.latitude,
                longitude:
                  capturedLocation.longitude,
                location_source:
                  'current_location',
                location_updated_at: now,
              }
            : {}),
        }

        const { error: businessUpdateError } =
          await supabase
            .from('businesses')
            .update(businessUpdate)
            .eq('id', business.id)

        if (businessUpdateError) {
          throw new Error(
            businessUpdateError.message
          )
        }
      }

      setMessage(
        hasCapturedLocation
          ? 'Business profile and location saved!'
          : 'Business profile saved!'
      )

      setLoading(false)
      window.location.reload()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Business profile could not be saved'
      )

      setLoading(false)
    }
  }

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <h2 className="text-lg font-semibold text-green-700">
        Edit Business Profile
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Update the business details customers
        will see.
      </p>

      <form
        onSubmit={handleSave}
        className="mt-4 space-y-4"
      >
        <div className="space-y-3">
          <img
            src={
              logoUrl ||
              '/default-business-logo.png'
            }
            alt="Business logo preview"
            className="h-20 w-20 rounded-xl border border-gray-200 object-cover"
          />

          <input
            className="w-full rounded-lg border border-gray-300 p-2"
            type="file"
            accept="image/*"
            onChange={(event) =>
              setLogoFile(
                event.target.files?.[0] ??
                  null
              )
            }
          />

          {logoUrl ? (
            <button
              type="button"
              onClick={handleRemoveLogo}
              disabled={loading}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Remove Logo
            </button>
          ) : null}
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Legal or internal business name
          </span>

          <input
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            placeholder="Business name"
            value={businessName}
            onChange={(event) =>
              setBusinessName(
                event.target.value
              )
            }
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Public display name
          </span>

          <input
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            placeholder="Display name (optional)"
            value={displayName}
            onChange={(event) =>
              setDisplayName(
                event.target.value
              )
            }
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Phone
          </span>

          <input
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            placeholder="Phone number"
            value={phone}
            onChange={(event) =>
              setPhone(event.target.value)
            }
          />
        </label>

        <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="text-2xl"
            >
              📍
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-green-900">
                Business Location
              </h3>

              <p className="mt-1 text-sm text-green-800">
                Add the customer-facing address,
                then capture the exact location
                while you are at the business.
              </p>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-green-900">
              Business address
            </span>

            <input
              className="mt-1 w-full rounded-lg border border-green-200 bg-white p-2"
              placeholder="Street, city, state and ZIP"
              value={address}
              onChange={(event) =>
                setAddress(event.target.value)
              }
            />
          </label>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={requestCurrentLocation}
              disabled={
                loading ||
                isRequestingLocation
              }
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRequestingLocation
                ? 'Finding Location…'
                : hasCapturedLocation
                  ? 'Refresh Current Location'
                  : 'Use My Current Location'}
            </button>

            {hasCapturedLocation ? (
              <button
                type="button"
                onClick={clearCapturedLocation}
                disabled={loading}
                className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100 disabled:opacity-50"
              >
                Remove Captured Location
              </button>
            ) : null}
          </div>

          <p
            className="mt-3 text-sm text-green-800"
            aria-live="polite"
          >
            {getLocationStatusMessage(
              locationStatus
            )}
          </p>

          {hasCapturedLocation ? (
            <p className="mt-2 text-xs text-green-700">
              The coordinates will not be shown
              publicly. They will be used to
              calculate approximate customer
              distance.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="text-2xl"
            >
              G
            </span>

            <div>
              <h3 className="font-semibold text-blue-900">
                Google Business Details
              </h3>

              <p className="mt-1 text-sm text-blue-800">
                Google business search and listing
                import will be connected next.
                Your manually entered details will
                remain under your control.
              </p>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-blue-900">
              Google Maps link
            </span>

            <input
              className="mt-1 w-full rounded-lg border border-blue-200 bg-white p-2"
              placeholder="Google Maps link"
              value={googleMapsUrl}
              onChange={(event) =>
                setGoogleMapsUrl(
                  event.target.value
                )
              }
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Website
          </span>

          <input
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            placeholder="Website URL"
            value={websiteUrl}
            onChange={(event) =>
              setWebsiteUrl(
                event.target.value
              )
            }
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading
              ? 'Saving...'
              : 'Save Profile'}
          </button>

          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:border-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {message ? (
        <p
          className="mt-3 text-sm text-gray-700"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}