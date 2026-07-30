'use client'

import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

type Props = {
  url: string
  campaignName: string
}

export default function ShareSellerLink({ url, campaignName }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const [showQrCode, setShowQrCode] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrCodeError, setQrCodeError] = useState<string | null>(null)

  useEffect(() => {
    if (!showQrCode || qrCodeDataUrl || qrCodeError) return

    let cancelled = false

    QRCode.toDataURL(url, {
      width: 640,
      margin: 3,
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (!cancelled) setQrCodeDataUrl(dataUrl)
      })
      .catch(() => {
        if (!cancelled) {
          setQrCodeError('RaiseHub could not prepare the QR code. Use Copy link instead.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [qrCodeDataUrl, qrCodeError, showQrCode, url])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Seller link copied.')
    } catch {
      setMessage('Unable to copy automatically. Press and hold the link to copy it.')
    }
  }

  async function shareLink() {
    if (!navigator.share) {
      await copyLink()
      return
    }

    try {
      await navigator.share({
        title: campaignName,
        text: `Support my fundraiser through RaiseHub: ${campaignName}`,
        url,
      })
      setMessage('Share menu opened.')
    } catch {
      // Closing the native share sheet is not an error the user needs to resolve.
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="seller-share-link" className="text-sm font-semibold text-gray-800">
        Your personal campaign link
      </label>
      <input
        id="seller-share-link"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"
      />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
        >
          Copy link
        </button>
        <button
          type="button"
          onClick={shareLink}
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Share
        </button>
        <button
          type="button"
          onClick={() => setShowQrCode((current) => !current)}
          aria-expanded={showQrCode}
          aria-controls="seller-campaign-qr-code"
          className="col-span-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700 hover:bg-violet-100"
        >
          {showQrCode ? 'Hide QR code' : 'Show QR code'}
        </button>
      </div>

      {showQrCode ? (
        <section
          id="seller-campaign-qr-code"
          className="rounded-2xl border border-violet-200 bg-white p-5 text-center shadow-sm"
        >
          <p className="text-lg font-bold text-gray-950">Scan to support {campaignName}</p>
          <p className="mt-1 text-sm text-gray-600">
            Hold this screen where a supporter can scan it with their phone camera.
          </p>
          <div className="mx-auto mt-5 flex min-h-64 max-w-72 items-center justify-center rounded-2xl bg-white p-3">
            {qrCodeDataUrl ? (
              // Generated locally from the authenticated seller's existing public campaign URL.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeDataUrl}
                alt={`QR code for ${campaignName}`}
                className="h-auto w-full"
              />
            ) : qrCodeError ? (
              <p className="text-sm text-red-700">{qrCodeError}</p>
            ) : (
              <p className="text-sm font-semibold text-gray-500">Preparing QR code…</p>
            )}
          </div>
          <p className="mt-3 break-all text-xs text-gray-500">{url}</p>
        </section>
      ) : null}

      {message ? <p className="text-sm text-gray-600" role="status">{message}</p> : null}
    </div>
  )
}
