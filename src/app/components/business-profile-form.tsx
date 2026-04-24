'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

  const [businessName, setBusinessName] = useState(initialBusinessName)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [phone, setPhone] = useState(initialPhone)
  const [address, setAddress] = useState(initialAddress)
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialGoogleMapsUrl)
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
        await supabase.storage.from('logos').remove([path])
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ logo_url: null })
      .eq('id', user.id)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setLogoUrl('')
    setLogoFile(null)
    setMessage('Logo removed')
    setLoading(false)
  }

  async function uploadLogo(userId: string) {
    if (!logoFile) return logoUrl

    const fileExt = logoFile.name.split('.').pop()
    const filePath = `businesses/${userId}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, logoFile, {
        upsert: true,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(filePath)

    return data.publicUrl
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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
      const uploadedLogoUrl = await uploadLogo(user.id)

      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: businessName,
          display_name: displayName,
          phone,
          address,
          google_maps_url: googleMapsUrl,
          website_url: websiteUrl,
          logo_url: uploadedLogoUrl || null,
        })
        .eq('id', user.id)

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      setMessage('Business profile saved!')
      setLoading(false)
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Logo upload failed')
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <h2 className="text-lg font-semibold text-green-700">
        Edit Business Profile
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Update the business details customers will see.
      </p>

      <form onSubmit={handleSave} className="mt-4 space-y-3">
        <img
          src={logoUrl || '/default-business-logo.png'}
          alt="Business logo preview"
          className="h-20 w-20 rounded-xl border border-gray-200 object-cover"
        />

        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          type="file"
          accept="image/*"
          onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
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

        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Business name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
        />

        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Display name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Website URL"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />

        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Google Maps link"
          value={googleMapsUrl}
          onChange={(e) => setGoogleMapsUrl(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>

          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:border-gray-400"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {message ? <p className="mt-2 text-sm text-gray-600">{message}</p> : null}
    </div>
  )
}