'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type BusinessProfileFormProps = {
  initialBusinessName: string
  initialPhone: string
  initialAddress: string
  initialGoogleMapsUrl: string
  onCancel?: () => void
}

export default function BusinessProfileForm({
  initialBusinessName,
  initialPhone,
  initialAddress,
  initialGoogleMapsUrl,
  onCancel,
}: BusinessProfileFormProps) {
  const supabase = createClient()

  const [businessName, setBusinessName] = useState(initialBusinessName)
  const [phone, setPhone] = useState(initialPhone)
  const [address, setAddress] = useState(initialAddress)
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialGoogleMapsUrl)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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

    const { error } = await supabase
      .from('profiles')
      .update({
        business_name: businessName,
        phone,
        address,
        google_maps_url: googleMapsUrl,
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
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <h2 className="text-lg font-semibold text-green-700">Edit Business Profile</h2>
      <p className="mt-2 text-sm text-gray-600">
        Update the business details customers will see.
      </p>

      <form onSubmit={handleSave} className="mt-4 space-y-3">
        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Business name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
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