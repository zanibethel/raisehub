'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type BookingService = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price_label: string | null
}

type Props = {
  slug: string
  accentColor: string
  textColor: string
  buttonLabel: string
}

function localDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayTime(value: string) {
  const [hoursText, minutes] = value.split(':')
  const hours = Number(hoursText)
  if (!Number.isFinite(hours)) return value
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes} ${suffix}`
}

export default function BookingWidget({
  slug,
  accentColor,
  textColor,
  buttonLabel,
}: Props) {
  const today = useMemo(() => new Date(), [])
  const maxDate = useMemo(() => {
    const date = new Date(today)
    date.setDate(date.getDate() + 60)
    return date
  }, [today])

  const [services, setServices] = useState<BookingService[]>([])
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [time, setTime] = useState('')
  const [loadingServices, setLoadingServices] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadServices() {
      try {
        const response = await fetch(
          `/api/public/business-sites/${encodeURIComponent(slug)}/booking`,
          { cache: 'no-store' }
        )
        const payload = await response.json()
        if (cancelled) return
        if (!response.ok) {
          setMessage(payload.error || 'Booking is unavailable right now.')
          return
        }
        setServices(payload.services ?? [])
        if ((payload.services ?? []).length === 1) {
          setServiceId(payload.services[0].id)
        }
      } catch {
        if (!cancelled) setMessage('Booking is unavailable right now.')
      } finally {
        if (!cancelled) setLoadingServices(false)
      }
    }

    void loadServices()
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([])
      setTime('')
      return
    }

    let cancelled = false
    async function loadSlots() {
      setLoadingSlots(true)
      setMessage('')
      setTime('')
      try {
        const params = new URLSearchParams({ serviceId, date })
        const response = await fetch(
          `/api/public/business-sites/${encodeURIComponent(slug)}/booking?${params.toString()}`,
          { cache: 'no-store' }
        )
        const payload = await response.json()
        if (cancelled) return
        if (!response.ok) {
          setMessage(payload.error || 'Available times could not be loaded.')
          setSlots([])
          return
        }
        setSlots(payload.slots ?? [])
      } catch {
        if (!cancelled) {
          setMessage('Available times could not be loaded.')
          setSlots([])
        }
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    }

    void loadSlots()
    return () => {
      cancelled = true
    }
  }, [date, serviceId, slug])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!serviceId || !date || !time) {
      setMessage('Choose a service, date, and available time first.')
      return
    }

    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/public/business-sites/${encodeURIComponent(slug)}/booking`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            serviceId,
            date,
            time,
            name: form.get('name'),
            email: form.get('email'),
            phone: form.get('phone'),
            note: form.get('note'),
          }),
        }
      )

      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error || 'Your appointment request could not be saved.')
        if (response.status === 409) {
          setTime('')
          const params = new URLSearchParams({ serviceId, date })
          const refresh = await fetch(
            `/api/public/business-sites/${encodeURIComponent(slug)}/booking?${params.toString()}`,
            { cache: 'no-store' }
          )
          const refreshed = await refresh.json()
          if (refresh.ok) setSlots(refreshed.slots ?? [])
        }
        return
      }

      setSuccess(true)
      setMessage(payload.message || 'Your appointment request was sent.')
    } catch {
      setMessage('Your appointment request could not be saved. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingServices) {
    return <p className="mt-5 text-sm opacity-80">Loading appointment options…</p>
  }

  if (!services.length) {
    return (
      <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm leading-6">
        Online booking is being set up. Please contact the business for now.
      </p>
    )
  }

  if (success) {
    return (
      <div className="mt-6 rounded-2xl bg-white p-5" style={{ color: textColor }}>
        <p className="font-black">Request sent</p>
        <p className="mt-2 text-sm leading-6">{message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          Service
          <select
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-3 text-slate-950"
            required
          >
            <option value="">Choose a service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
                {service.price_label ? ` · ${service.price_label}` : ''}
                {service.duration_minutes ? ` · ${service.duration_minutes} min` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-bold">
          Date
          <input
            type="date"
            value={date}
            min={localDateValue(today)}
            max={localDateValue(maxDate)}
            onChange={(event) => setDate(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-3 text-slate-950"
            required
          />
        </label>
      </div>

      {date && serviceId ? (
        <div>
          <p className="text-sm font-bold">Available times</p>
          {loadingSlots ? (
            <p className="mt-2 text-sm opacity-80">Checking times…</p>
          ) : slots.length ? (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className="rounded-xl border px-3 py-2.5 text-sm font-black transition"
                  style={{
                    borderColor: time === slot ? '#ffffff' : 'rgba(255,255,255,.3)',
                    backgroundColor: time === slot ? '#ffffff' : 'transparent',
                    color: time === slot ? accentColor : 'inherit',
                  }}
                >
                  {displayTime(slot)}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm opacity-80">
              No online times are available on this date.
            </p>
          )}
        </div>
      ) : null}

      {time ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">
            Your name
            <input
              name="name"
              maxLength={120}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-3 text-slate-950"
              required
            />
          </label>
          <label className="block text-sm font-bold">
            Email
            <input
              name="email"
              type="email"
              maxLength={254}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-3 text-slate-950"
              required
            />
          </label>
          <label className="block text-sm font-bold">
            Phone <span className="font-normal opacity-70">(optional)</span>
            <input
              name="phone"
              maxLength={50}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-3 text-slate-950"
            />
          </label>
          <label className="block text-sm font-bold">
            Note <span className="font-normal opacity-70">(optional)</span>
            <input
              name="note"
              maxLength={1000}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-3 text-slate-950"
              placeholder="Anything the business should know?"
            />
          </label>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-xl bg-white/10 p-3 text-sm font-semibold">{message}</p>
      ) : null}

      {time ? (
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-white px-5 py-3 font-black shadow-sm disabled:opacity-50 sm:w-auto"
          style={{ color: accentColor }}
        >
          {submitting ? 'Sending request…' : buttonLabel || 'Request appointment'}
        </button>
      ) : null}
    </form>
  )
}
