import { NextResponse } from 'next/server'

import { sendNotificationEmail } from '@/lib/notifications/email'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed'

type UpdateBody = {
  status?: unknown
}

const allowedTransitions: Record<string, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
}

function displayTime(value: string) {
  const [hoursText, minutes] = value.split(':')
  const hours = Number(hoursText)
  if (!Number.isFinite(hours)) return value
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`
}

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to manage appointments.' }, { status: 401 })
  }

  let body: UpdateBody
  try {
    body = (await request.json()) as UpdateBody
  } catch {
    return NextResponse.json({ error: 'The appointment update could not be read.' }, { status: 400 })
  }

  const status =
    body.status === 'confirmed' ||
    body.status === 'cancelled' ||
    body.status === 'completed'
      ? body.status
      : null

  if (!status) {
    return NextResponse.json({ error: 'Choose a valid appointment status.' }, { status: 400 })
  }

  const { id } = await context.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid appointment.' }, { status: 400 })
  }

  const admin = createAdminClient() as any

  const { data: appointment, error: appointmentError } = await admin
    .from('business_appointments')
    .select(
      'id,business_id,service_name_snapshot,customer_name,customer_email,appointment_date,start_time,end_time,status'
    )
    .eq('id', id)
    .maybeSingle()

  if (appointmentError) {
    console.error('Unable to load appointment for update', {
      appointmentId: id,
      message: appointmentError.message,
    })
    return NextResponse.json({ error: 'Appointment is temporarily unavailable.' }, { status: 500 })
  }

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })
  }

  const [{ data: membership }, { data: actorProfile }] = await Promise.all([
    admin
      .from('business_memberships')
      .select('id')
      .eq('business_id', appointment.business_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('membership_role', ['owner', 'manager'])
      .maybeSingle(),
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])

  if (!membership && actorProfile?.role !== 'owner') {
    return NextResponse.json({ error: 'You do not have access to this appointment.' }, { status: 403 })
  }

  const allowed = allowedTransitions[appointment.status] ?? []
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `A ${appointment.status} appointment cannot be changed to ${status}.` },
      { status: 409 }
    )
  }

  const { data: business } = await admin
    .from('businesses')
    .select('id,name')
    .eq('id', appointment.business_id)
    .maybeSingle()

  const now = new Date().toISOString()
  const patch: Record<string, string | null> = {
    status,
    updated_at: now,
  }

  if (status === 'confirmed') patch.confirmed_at = now
  if (status === 'cancelled') patch.cancelled_at = now

  const { data: updated, error: updateError } = await admin
    .from('business_appointments')
    .update(patch)
    .eq('id', appointment.id)
    .eq('status', appointment.status)
    .select('id,status')
    .maybeSingle()

  if (updateError) {
    console.error('Unable to update appointment status', {
      appointmentId: appointment.id,
      message: updateError.message,
    })
    return NextResponse.json({ error: 'Appointment could not be updated.' }, { status: 500 })
  }

  if (!updated) {
    return NextResponse.json(
      { error: 'This appointment changed while you were viewing it. Refresh and try again.' },
      { status: 409 }
    )
  }

  if (status === 'confirmed' || status === 'cancelled') {
    const businessName = business?.name || 'the business'
    const summary = `${appointment.service_name_snapshot} on ${appointment.appointment_date} at ${displayTime(appointment.start_time)}`
    const title = status === 'confirmed' ? 'Appointment confirmed' : 'Appointment cancelled'
    const message =
      status === 'confirmed'
        ? `${businessName} confirmed your ${summary} appointment request.`
        : `${businessName} cancelled your ${summary} appointment. Contact the business if you need help choosing another time.`

    const result = await sendNotificationEmail({
      to: appointment.customer_email,
      recipientName: appointment.customer_name,
      title,
      message,
      idempotencyKey: `business-booking-${status}-${appointment.id}`,
    })

    if (result.status === 'failed') {
      console.error('Appointment status email delivery failed', {
        appointmentId: appointment.id,
        status,
        error: result.error,
      })
    }
  }

  return NextResponse.json({
    success: true,
    appointmentId: updated.id,
    status: updated.status,
  })
}
