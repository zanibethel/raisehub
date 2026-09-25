'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

type Business = {
  id: string
  name: string
}

type BookingService = {
  id: string
  business_id: string
  name: string
  description: string | null
  duration_minutes: number
  price_label: string | null
  is_active: boolean
  sort_order: number
}

type AvailabilityWindow = {
  id: string
  business_id: string
  weekday: number
  start_time: string
  end_time: string
  is_active: boolean
}

type Appointment = {
  id: string
  business_id: string
  service_id: string | null
  service_name_snapshot: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_note: string | null
  appointment_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  created_at: string
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function dateValue(date = new Date()) {
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
  return `${hours % 12 || 12}:${minutes} ${suffix}`
}

function displayDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
}

export default function BusinessSchedulerPage() {
  const supabase = useMemo(() => createClient(), [])
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<BookingService[]>([])
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [message, setMessage] = useState('')

  const [serviceName, setServiceName] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [duration, setDuration] = useState(60)
  const [priceLabel, setPriceLabel] = useState('')

  const [weekday, setWeekday] = useState(1)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')

  async function refresh(businessId: string) {
    const [{ data: serviceRows }, { data: availabilityRows }, { data: appointmentRows }] =
      await Promise.all([
        supabase
          .from('business_booking_services')
          .select('*')
          .eq('business_id', businessId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('business_booking_availability')
          .select('*')
          .eq('business_id', businessId)
          .order('weekday', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('business_appointments')
          .select('*')
          .eq('business_id', businessId)
          .gte('appointment_date', dateValue())
          .in('status', ['pending', 'confirmed'])
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true }),
      ])

    setServices((serviceRows ?? []) as BookingService[])
    setAvailability((availabilityRows ?? []) as AvailabilityWindow[])
    setAppointments((appointmentRows ?? []) as Appointment[])
  }

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login?next=/dashboard/business/scheduler'
        return
      }

      const { data: memberships } = await supabase
        .from('business_memberships')
        .select('business_id,membership_role,status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .in('membership_role', ['owner', 'manager'])
        .limit(1)

      let businessId = memberships?.[0]?.business_id as string | undefined

      if (!businessId) {
        const { data: legacyBusiness } = await supabase
          .from('businesses')
          .select('id')
          .eq('legacy_profile_id', user.id)
          .maybeSingle()
        businessId = legacyBusiness?.id
      }

      if (!businessId) {
        setMessage('Finish your business setup before using scheduling.')
        setLoading(false)
        return
      }

      const { data: businessRow } = await supabase
        .from('businesses')
        .select('id,name')
        .eq('id', businessId)
        .single()

      if (!businessRow) {
        setMessage('We could not load your business.')
        setLoading(false)
        return
      }

      setBusiness(businessRow as Business)
      await refresh(businessId)
      setLoading(false)
    }

    void load()
  }, [supabase])

  async function addService(event: FormEvent) {
    event.preventDefault()
    if (!business || !serviceName.trim()) return

    setWorking('service')
    setMessage('')

    const { error } = await supabase.from('business_booking_services').insert({
      business_id: business.id,
      name: serviceName.trim(),
      description: serviceDescription.trim() || null,
      duration_minutes: duration,
      price_label: priceLabel.trim() || null,
      is_active: true,
      sort_order: services.length,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setServiceName('')
      setServiceDescription('')
      setPriceLabel('')
      setDuration(60)
      setMessage('Service added.')
      await refresh(business.id)
    }

    setWorking('')
  }

  async function toggleService(service: BookingService) {
    if (!business) return
    setWorking(service.id)
    setMessage('')

    const { error } = await supabase
      .from('business_booking_services')
      .update({
        is_active: !service.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', service.id)

    if (error) setMessage(error.message)
    else await refresh(business.id)

    setWorking('')
  }

  async function addAvailability(event: FormEvent) {
    event.preventDefault()
    if (!business) return

    if (startTime >= endTime) {
      setMessage('End time must be later than start time.')
      return
    }

    setWorking('availability')
    setMessage('')

    const { error } = await supabase.from('business_booking_availability').insert({
      business_id: business.id,
      weekday,
      start_time: startTime,
      end_time: endTime,
      is_active: true,
    })

    if (error) {
      setMessage(
        /duplicate|unique/i.test(error.message)
          ? 'That availability window is already added.'
          : error.message
      )
    } else {
      setMessage('Availability added.')
      await refresh(business.id)
    }

    setWorking('')
  }

  async function addWeekdayDefaults() {
    if (!business) return
    setWorking('weekday-defaults')
    setMessage('')

    const existing = new Set(
      availability.map(
        (item) => `${item.weekday}|${item.start_time.slice(0, 5)}|${item.end_time.slice(0, 5)}`
      )
    )

    const rows = [1, 2, 3, 4, 5]
      .filter((day) => !existing.has(`${day}|09:00|17:00`))
      .map((day) => ({
        business_id: business.id,
        weekday: day,
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
      }))

    if (!rows.length) {
      setMessage('Monday–Friday 9–5 is already set.')
      setWorking('')
      return
    }

    const { error } = await supabase
      .from('business_booking_availability')
      .insert(rows)

    if (error) setMessage(error.message)
    else {
      setMessage('Monday–Friday 9–5 added. Adjust individual days as needed.')
      await refresh(business.id)
    }

    setWorking('')
  }

  async function removeAvailability(id: string) {
    if (!business) return
    setWorking(id)
    const { error } = await supabase
      .from('business_booking_availability')
      .delete()
      .eq('id', id)

    if (error) setMessage(error.message)
    else await refresh(business.id)
    setWorking('')
  }

  async function updateAppointment(
    appointment: Appointment,
    status: 'confirmed' | 'cancelled' | 'completed'
  ) {
    if (!business) return
    setWorking(appointment.id)
    setMessage('')

    try {
      const response = await fetch(
        `/api/business/scheduler/appointments/${encodeURIComponent(appointment.id)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage(payload?.error || 'Appointment could not be updated.')
        return
      }

      setMessage(
        status === 'confirmed'
          ? 'Appointment accepted. The customer was notified when email delivery is available.'
          : status === 'cancelled'
            ? 'Appointment cancelled. The customer was notified when email delivery is available.'
            : 'Appointment completed.'
      )
      await refresh(business.id)
    } catch {
      setMessage('Appointment could not be updated. Please try again.')
    } finally {
      setWorking('')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-sm">
          Loading scheduler…
        </div>
      </main>
    )
  }

  if (!business) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black">RaiseHub Scheduler</h1>
          <p className="mt-3 text-slate-600">{message}</p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-black text-white">
            Back to dashboard
          </Link>
        </div>
      </main>
    )
  }

  const pendingCount = appointments.filter(
    (appointment) => appointment.status === 'pending'
  ).length

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 px-5 py-8 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700">
              RaiseHub Scheduler
            </p>
            <h1 className="mt-2 text-3xl font-black">{business.name}</h1>
            <p className="mt-2 text-slate-600">
              Set what customers can book, when you are available, and handle incoming requests.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/business/website" className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700">
              Website + App
            </Link>
            <Link href="/dashboard" className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">
              Dashboard
            </Link>
          </div>
        </div>

        {message ? (
          <p className="mb-4 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
            {message}
          </p>
        ) : null}

        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                1 · Services
              </p>
              <h2 className="mt-1 text-xl font-black">What can customers book?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep this short. Each service gets its own duration and optional price label.
              </p>
            </div>

            {services.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {services.map((service) => (
                  <article key={service.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{service.name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {service.duration_minutes} min
                          {service.price_label ? ` · ${service.price_label}` : ''}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${service.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                        {service.is_active ? 'Bookable' : 'Paused'}
                      </span>
                    </div>
                    {service.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-500">{service.description}</p>
                    ) : null}
                    <button
                      type="button"
                      disabled={working === service.id}
                      onClick={() => toggleService(service)}
                      className="mt-3 text-sm font-black text-blue-700 disabled:opacity-50"
                    >
                      {service.is_active ? 'Pause service' : 'Make bookable'}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
                Add your first service to start showing appointment times.
              </p>
            )}

            <form onSubmit={addService} className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Service name
                <input value={serviceName} onChange={(e) => setServiceName(e.target.value)} required maxLength={120} className="mt-1 w-full rounded-xl border border-blue-200 bg-white p-3" placeholder="Haircut, consultation, tune-up…" />
              </label>
              <label className="text-sm font-bold">
                Duration
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-blue-200 bg-white p-3">
                  {[15, 30, 45, 60, 90, 120, 180, 240].map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes} minutes</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Price label <span className="font-normal text-slate-500">(optional)</span>
                <input value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} maxLength={80} className="mt-1 w-full rounded-xl border border-blue-200 bg-white p-3" placeholder="$45 or Starting at $80" />
              </label>
              <label className="text-sm font-bold">
                Description <span className="font-normal text-slate-500">(optional)</span>
                <input value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} maxLength={500} className="mt-1 w-full rounded-xl border border-blue-200 bg-white p-3" />
              </label>
              <button type="submit" disabled={working === 'service'} className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white disabled:opacity-50 sm:col-span-2">
                {working === 'service' ? 'Adding…' : '+ Add service'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
                  2 · Weekly availability
                </p>
                <h2 className="mt-1 text-xl font-black">When can people book?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add one or more windows per day. Appointment length comes from the service.
                </p>
              </div>
              <button
                type="button"
                onClick={addWeekdayDefaults}
                disabled={working === 'weekday-defaults'}
                className="rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-black text-green-800 disabled:opacity-50"
              >
                Use Mon–Fri 9–5
              </button>
            </div>

            {availability.length ? (
              <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {availability.map((window) => (
                  <div key={window.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-black">{WEEKDAYS[window.weekday]}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {displayTime(window.start_time)} – {displayTime(window.end_time)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={working === window.id}
                      onClick={() => removeAvailability(window.id)}
                      className="text-sm font-black text-red-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-green-50 p-4 text-sm text-green-900">
                No online booking hours yet. Use the quick weekday setup or add a custom window below.
              </p>
            )}

            <form onSubmit={addAvailability} className="mt-5 grid gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 sm:grid-cols-4">
              <label className="text-sm font-bold">
                Day
                <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-green-200 bg-white p-3">
                  {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold">
                Start
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 w-full rounded-xl border border-green-200 bg-white p-3" required />
              </label>
              <label className="text-sm font-bold">
                End
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full rounded-xl border border-green-200 bg-white p-3" required />
              </label>
              <button type="submit" disabled={working === 'availability'} className="self-end rounded-xl bg-green-600 px-4 py-3 font-black text-white disabled:opacity-50">
                Add window
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                  3 · Upcoming appointments
                </p>
                <h2 className="mt-1 text-xl font-black">Requests that need your attention</h2>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                {pendingCount} pending
              </span>
            </div>

            {appointments.length ? (
              <div className="mt-5 space-y-3">
                {appointments.map((appointment) => (
                  <article key={appointment.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{appointment.service_name_snapshot}</p>
                        <p className="mt-1 text-sm font-bold text-blue-700">
                          {displayDate(appointment.appointment_date)} · {displayTime(appointment.start_time)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {appointment.status === 'confirmed' ? 'accepted' : appointment.status}
                      </span>
                    </div>

                    <div className="mt-3 text-sm leading-6 text-slate-600">
                      <p><strong className="text-slate-900">{appointment.customer_name}</strong></p>
                      <p><a href={`mailto:${appointment.customer_email}`} className="text-blue-700 underline">{appointment.customer_email}</a></p>
                      {appointment.customer_phone ? <p><a href={`tel:${appointment.customer_phone}`} className="text-blue-700">{appointment.customer_phone}</a></p> : null}
                      {appointment.customer_note ? <p className="mt-2 rounded-xl bg-slate-50 p-3">{appointment.customer_note}</p> : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {appointment.status === 'pending' ? (
                        <button type="button" disabled={working === appointment.id} onClick={() => updateAppointment(appointment, 'confirmed')} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                          Confirm
                        </button>
                      ) : null}
                      {appointment.status === 'confirmed' ? (
                        <button type="button" disabled={working === appointment.id} onClick={() => updateAppointment(appointment, 'completed')} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                          Complete
                        </button>
                      ) : null}
                      <button type="button" disabled={working === appointment.id} onClick={() => updateAppointment(appointment, 'cancelled')} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 disabled:opacity-50">
                        Cancel
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                No upcoming appointment requests yet.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
