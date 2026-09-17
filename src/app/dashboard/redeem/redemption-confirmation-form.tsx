'use client'

import { useState, useTransition } from 'react'

import { confirmRedemptionAction } from '@/app/redemptions/actions'

type Props = {
  initialCode?: string
}

function normalizeCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
}

export default function RedemptionConfirmationForm({ initialCode = '' }: Props) {
  const [code, setCode] = useState(normalizeCode(initialCode))
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()

    setMessage('')
    setSuccess(false)

    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      setMessage('Enter the 6-character verification code shown on the supporter’s screen.')
      return
    }

    startTransition(async () => {
      const result = await confirmRedemptionAction(normalized)

      if (!result.success) {
        setMessage(result.error)
        return
      }

      setSuccess(true)
      setMessage('Redemption verified immediately. No further review is required for this visit.')
      setCode('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <label className="block">
        <span className="text-sm font-bold text-slate-900">Supporter verification code</span>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Scan the supporter’s RaiseHub QR code or enter the short code manually to confirm a redemption immediately. Normal redemptions do not require this step.
        </p>
        <input
          value={code}
          onChange={(event) => setCode(normalizeCode(event.target.value))}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="ABC123"
          aria-label="6-character supporter verification code"
          className="mt-3 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-center font-mono text-3xl font-black tracking-[0.18em] text-slate-950 outline-none transition focus:border-green-600"
        />
      </label>

      {initialCode && code ? (
        <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-800">
          QR code detected. Review the code, then tap Verify Now.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || code.length !== 6}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Verifying…' : 'Verify Now'}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-slate-500">
        QR scanning and manual code entry confirm the same RaiseHub redemption record.
      </p>

      {message ? (
        <p
          role={success ? 'status' : 'alert'}
          className={`mt-4 rounded-2xl border p-4 text-sm font-semibold leading-6 ${
            success
              ? 'border-green-200 bg-green-50 text-green-900'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  )
}
