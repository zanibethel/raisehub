'use client'

import { useState, useTransition } from 'react'

import { updateCanonicalBusinessProfileAction } from '@/app/dashboard/business-profile-actions'
import { createClient } from '@/lib/supabase/client'

type CanonicalBusinessProfileFormProps = {
  businessId: string
  initialBusinessName: string
  initialDisplayName: string
  initialPhone: string
  initialAddress: string
  initialGoogleMapsUrl: string
  initialLogoUrl: string
  initialWebsiteUrl: string
}

type CapturedLocation = {
  latitude: number
  longitude: number
}

export default function CanonicalBusinessProfileForm({
  businessId,
  initialBusinessName,
  initialDisplayName,
  initialPhone,
  initialAddress,
  initialGoogleMapsUrl,
  initialLogoUrl,
  initialWebsiteUrl,
}: CanonicalBusinessProfileFormProps) {
  const [businessName, setBusinessName] = useState(initialBusinessName)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [phone, setPhone] = useState(initialPhone)
  const [address, setAddress] = useState(initialAddress)
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialGoogleMapsUrl)
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [capturedLocation, setCapturedLocation] = useState<CapturedLocation | null>(null)
  const [locationMessage, setLocationMessage] = useState('Use this while you are physically at the business location.')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  async function uploadLogo() {
    if (!logoFile) return logoUrl

    const supabase = createClient()
    const extension = logoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `businesses/${businessId}-${Date.now()}.${extension}`
    const { error } = await supabase.storage
      .from('logos')
      .upload(path, logoFile, { upsert: true })

    if (error) throw new Error(error.message)

    return supabase.storage.from('logos').getPublicUrl(path).data.publicUrl
  }

  function captureCurrentLocation() {
    setLocationMessage('Waiting for your device to share its location…')

    if (!navigator.geolocation) {
      setLocationMessage('This browser does not support location access. You can still enter the address manually.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCapturedLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationMessage('Location captured. Save the profile to use it for nearby-offer distance calculations.')
      },
      () => {
        setCapturedLocation(null)
        setLocationMessage('RaiseHub could not capture your location. Check browser location permission or enter the address manually.')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    startTransition(async () => {
      try {
        const uploadedLogoUrl = await uploadLogo()
        const result = await updateCanonicalBusinessProfileAction({
          businessId,
          businessName,
          displayName,
          phone,
          address,
          googleMapsUrl,
          websiteUrl,
          logoUrl: uploadedLogoUrl,
          latitude: capturedLocation?.latitude ?? null,
          longitude: capturedLocation?.longitude ?? null,
        })

        if (!result.success) {
          setMessage(result.error)
          return
        }

        setLogoUrl(uploadedLogoUrl)
        setLogoFile(null)
        setMessage('Business profile saved.')
        window.location.reload()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Business profile could not be saved.')
      }
    })
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">Canonical business workspace</p>
          <h2 className="mt-1 text-lg font-semibold text-green-800">Edit Business Profile</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">These details are saved directly to the selected RaiseHub business instead of your personal account profile.</p>
        </div>
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">Workspace-linked</span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl || '/default-business-logo.png'}
            alt="Business logo preview"
            className="h-20 w-20 rounded-xl border border-gray-200 bg-white object-cover"
          />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700" htmlFor="canonical-business-logo">Business logo</label>
            <input
              id="canonical-business-logo"
              type="file"
              accept="image/*"
              onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"
            />
            {logoUrl ? (
              <button type="button" onClick={() => { setLogoUrl(''); setLogoFile(null) }} className="mt-2 text-xs font-semibold text-red-700 hover:underline">
                Remove logo when I save
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            Legal or internal business name
            <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 p-2.5" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Public display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Defaults to business name" className="mt-1 w-full rounded-lg border border-gray-300 p-2.5" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 p-2.5" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Website
            <input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-gray-300 p-2.5" />
          </label>
        </div>

        <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
          <label className="block text-sm font-medium text-green-950">
            Business address or service area
            <input value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 w-full rounded-lg border border-green-200 bg-white p-2.5" />
          </label>
          <button type="button" onClick={captureCurrentLocation} disabled={isPending} className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">
            Use My Current Location
          </button>
          <p className="mt-2 text-xs leading-5 text-green-800" aria-live="polite">{locationMessage}</p>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          Google Maps link
          <input value={googleMapsUrl} onChange={(event) => setGoogleMapsUrl(event.target.value)} placeholder="https://maps.google.com/…" className="mt-1 w-full rounded-lg border border-gray-300 p-2.5" />
        </label>

        <button type="submit" disabled={isPending} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          {isPending ? 'Saving…' : 'Save Business Profile'}
        </button>
      </form>

      {message ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700" aria-live="polite">{message}</p> : null}
    </div>
  )
}
