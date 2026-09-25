'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

type Appointment = {
  id: string
  service_name_snapshot: string
  customer_name: string
  customer_email: string
  appointment_date: string
  start_time: string
  status: string
}

type ActionStatus = 'confirmed' | 'cancelled'

function displayTime(value: string) {
  const [hoursText, minutes] = value.split(':')
  const hours = Number(hoursText)
  if (!Number.isFinite(hours)) return value
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`
}

export default function SchedulerEmailActionPage() {
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [action, setAction] = useState<ActionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const params = new URLSearchParams(window.location.search)
    const appointmentId = params.get('appointment') ?? ''
    const requestedAction = params.get('action')
    const nextAction: ActionStatus | null =
      requestedAction === 'confirmed' || requestedAction === 'cancelled'
        ? requestedAction
        : null

    setAction(nextAction)

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const next = window.location.pathname + window.location.search
        window.location.href = `/login?next=${encodeURIComponent(next)}`
        return
      }

      if (!appointmentId || !nextAction) {
        setMessage('This email action link is incomplete.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('business_appointments')
        .select(
          'id,service_name_snapshot,customer_name,customer_email,appointment_date,start_time,status'
        )
        .eq('id', appointmentId)
        .maybeSingle()

      if (error || !data) {
        setMessage('This appointment could not be loaded or you do not have access to it.')
        setLoading(false)
        return
      }

      setAppointment(data as Appointment)
      setLoading(false)
    }

    void load()
  }, [])

  async function confirmAction() {
    if (!appointment || !action) return
    setWorking(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/business/scheduler/appointments/${encodeURIComponent(appointment.id)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: action }),
        }
      )

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage(payload?.error || 'The appointment could not be updated.')
        return
      }

      setAppointment((current) =>
        current ? { ...current, status: payload.status } : current
      )
      setMessage(
        action === 'confirmed'
          ? 'Accepted. The customer was sent a confirmation email when email delivery is available.'
          : 'Cancelled. The customer was sent a cancellation email when email delivery is available.'
      )
    } catch {
      setMessage('The appointment could not be updated. Please try again.')
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          Loading appointment…
        </div>
      </main>
    )
  }

  if (!appointment || !action) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-black">Booking action</h1>
          <p className="mt-3 text-slate-600">{message || 'This action is unavailable.'}</p>
          <Link href="/dashboard/business/scheduler" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-black text-white">
            Open Scheduler
          </Link>
        </div>
      </main>
    )
  }

  const alreadyHandled =
    appointment.status !== 'pending' &&
    !(appointment.status === 'confirmed' && action === 'cancelled')

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 px-5 py-10 text-slate-950">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700">
          RaiseHub Booking
        </p>
        <h1 className="mt-2 text-3xl font-black">
          {action === 'confirmed' ? 'Accept booking?' : 'Cancel booking?'}
        </h1>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <p className="font-black">{appointment.service_name_snapshot}</p>
          <p className="mt-2 text-sm text-slate-600">
            {appointment.appointment_date} · {displayTime(appointment.start_time)}
          </p>
          <p className="mt-3 text-sm">
            <strong>{appointment.customer_name}</strong>
            <br />
            {appointment.customer_email}
          </p>
          <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-500">
            Current status: {appointment.status === 'confirmed' ? 'accepted' : appointment.status}
          </p>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm font-semibold text-white">
            {message}
          </p>
        ) : null}

        {!message && !alreadyHandled ? (
          <button
            type="button"
            disabled={working}
            onClick={confirmAction}
            className={`mt-6 w-full rounded-xl px-5 py-3 font-black text-white disabled:opacity-50 ${
              action === 'confirmed' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {working
              ? 'Updating…'
              : action === 'confirmed'
                ? 'Yes, accept booking'
                : 'Yes, cancel booking'}
          </button>
        ) : null}

        {alreadyHandled && !message ? (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            This booking has already been handled. Open Scheduler to see its current status.
          </p>
        ) : null}

        <Link href="/dashboard/business/scheduler" className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700">
          Open Scheduler
        </Link>
      </section>
    </main>
  )
}
