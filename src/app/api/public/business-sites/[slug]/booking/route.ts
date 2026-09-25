import { NextResponse } from 'next/server'

import { isDemoMode } from '@/lib/app-mode'
import {
  normalizeBookingConfig,
  normalizeEnabledModules,
} from '@/lib/business-app-modules'
import {
  addMinutesToTime,
  dateWithinBookingWindow,
  generateBookingSlots,
  weekdayFromDate,
} from '@/lib/booking/scheduler'
import {
  getActiveDataEnvironment,
  recordMatchesEnvironment,
} from '@/lib/data-environment'
import { buildPublicRateLimitSubject } from '@/lib/security/request-identity'
import { consumeRateLimit } from '@/lib/security/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotificationEmail } from '@/lib/notifications/email'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ slug: string }>
}

type BookingBody = {
  serviceId?: unknown
  date?: unknown
  time?: unknown
  name?: unknown
  email?: unknown
  phone?: unknown
  note?: unknown
}

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function resolveBookingBusiness(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    return { error: 'Invalid site address.', status: 400 as const }
  }

  const admin = createAdminClient() as any
  const environment = getActiveDataEnvironment()

  const { data: site, error: siteError } = await admin
    .from('business_sites')
    .select(
      'business_id,slug,site_title,is_published,enabled_modules,booking_config'
    )
    .eq('slug', normalizedSlug)
    .eq('is_published', true)
    .maybeSingle()

  if (siteError) {
    console.error('Booking site lookup failed', {
      slug: normalizedSlug,
      message: siteError.message,
    })
    return { error: 'Booking is temporarily unavailable.', status: 500 as const }
  }

  if (!site) {
    return { error: 'Booking is not available for this business.', status: 404 as const }
  }

  const enabledModules = normalizeEnabledModules(site.enabled_modules)
  const bookingConfig = normalizeBookingConfig(site.booking_config)

  if (!enabledModules.includes('booking') || bookingConfig.mode !== 'internal') {
    return { error: 'RaiseHub scheduling is not enabled for this business.', status: 404 as const }
  }

  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('id,name,email,is_demo,demo_group,status,archived_at')
    .eq('id', site.business_id)
    .maybeSingle()

  if (businessError) {
    console.error('Booking business lookup failed', {
      slug: normalizedSlug,
      businessId: site.business_id,
      message: businessError.message,
    })
    return { error: 'Booking is temporarily unavailable.', status: 500 as const }
  }

  if (
    !business ||
    business.status !== 'active' ||
    business.archived_at ||
    !recordMatchesEnvironment(business, environment)
  ) {
    return { error: 'Booking is not available for this business.', status: 404 as const }
  }

  return {
    admin,
    site,
    business,
    bookingConfig,
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params
  const resolved = await resolveBookingBusiness(slug)

  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { admin, business } = resolved
  const { searchParams } = new URL(request.url)
  const serviceId = clean(searchParams.get('serviceId'), 80)
  const date = clean(searchParams.get('date'), 10)

  const { data: services, error: servicesError } = await admin
    .from('business_booking_services')
    .select('id,name,description,duration_minutes,price_label')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (servicesError) {
    console.error('Booking service lookup failed', {
      businessId: business.id,
      message: servicesError.message,
    })
    return NextResponse.json(
      { error: 'Booking services are temporarily unavailable.' },
      { status: 500 }
    )
  }

  if (!serviceId || !date) {
    return NextResponse.json({ services: services ?? [], slots: [] })
  }

  if (!dateWithinBookingWindow(date, 60)) {
    return NextResponse.json(
      { error: 'Choose a date within the next 60 days.' },
      { status: 400 }
    )
  }

  const service = (services ?? []).find((item: any) => item.id === serviceId)
  if (!service) {
    return NextResponse.json({ error: 'Choose an available service.' }, { status: 400 })
  }

  const weekday = weekdayFromDate(date)
  if (weekday === null) {
    return NextResponse.json({ error: 'Choose a valid date.' }, { status: 400 })
  }

  const [{ data: windows, error: windowsError }, { data: appointments, error: appointmentsError }] =
    await Promise.all([
      admin
        .from('business_booking_availability')
        .select('start_time,end_time')
        .eq('business_id', business.id)
        .eq('weekday', weekday)
        .eq('is_active', true)
        .order('start_time', { ascending: true }),
      admin
        .from('business_appointments')
        .select('start_time,end_time,status')
        .eq('business_id', business.id)
        .eq('appointment_date', date)
        .in('status', ['pending', 'confirmed']),
    ])

  if (windowsError || appointmentsError) {
    console.error('Booking availability lookup failed', {
      businessId: business.id,
      windows: windowsError?.message,
      appointments: appointmentsError?.message,
    })
    return NextResponse.json(
      { error: 'Available times are temporarily unavailable.' },
      { status: 500 }
    )
  }

  const slots = generateBookingSlots({
    durationMinutes: service.duration_minutes,
    windows: windows ?? [],
    appointments: appointments ?? [],
  })

  return NextResponse.json({
    services: services ?? [],
    selectedService: service,
    date,
    slots,
  })
}

export async function POST(request: Request, context: RouteContext) {
  let body: BookingBody
  try {
    body = (await request.json()) as BookingBody
  } catch {
    return NextResponse.json({ error: 'The booking request could not be read.' }, { status: 400 })
  }

  const serviceId = clean(body.serviceId, 80)
  const date = clean(body.date, 10)
  const time = clean(body.time, 8)
  const name = clean(body.name, 120)
  const email = clean(body.email, 254).toLowerCase()
  const phone = clean(body.phone, 50)
  const note = clean(body.note, 1000)

  if (
    !serviceId ||
    !dateWithinBookingWindow(date, 60) ||
    !/^\d{2}:\d{2}$/.test(time) ||
    !name ||
    !isEmail(email)
  ) {
    return NextResponse.json(
      { error: 'Choose a service and time, then add your name and a valid email.' },
      { status: 400 }
    )
  }

  const { slug } = await context.params
  const resolved = await resolveBookingBusiness(slug)

  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { admin, business } = resolved

  try {
    const decision = await consumeRateLimit({
      scope: isDemoMode() ? 'business_booking:create:demo' : 'business_booking:create:live',
      subject: buildPublicRateLimitSubject({
        request,
        discriminator: email,
      }),
      limit: 6,
      windowSeconds: 15 * 60,
    })

    if (!decision.allowed) {
      return NextResponse.json(
        { error: 'Too many booking attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(decision.retryAfterSeconds, 1)),
          },
        }
      )
    }
  } catch (error) {
    console.error('Unable to confirm booking rate limit:', error)
    return NextResponse.json(
      { error: 'Booking is temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  const { data: service, error: serviceError } = await admin
    .from('business_booking_services')
    .select('id,name,duration_minutes')
    .eq('id', serviceId)
    .eq('business_id', business.id)
    .eq('is_active', true)
    .maybeSingle()

  if (serviceError || !service) {
    return NextResponse.json({ error: 'That service is no longer available.' }, { status: 400 })
  }

  const weekday = weekdayFromDate(date)
  if (weekday === null) {
    return NextResponse.json({ error: 'Choose a valid date.' }, { status: 400 })
  }

  const [{ data: windows, error: windowsError }, { data: appointments, error: appointmentsError }] =
    await Promise.all([
      admin
        .from('business_booking_availability')
        .select('start_time,end_time')
        .eq('business_id', business.id)
        .eq('weekday', weekday)
        .eq('is_active', true),
      admin
        .from('business_appointments')
        .select('start_time,end_time,status')
        .eq('business_id', business.id)
        .eq('appointment_date', date)
        .in('status', ['pending', 'confirmed']),
    ])

  if (windowsError || appointmentsError) {
    return NextResponse.json(
      { error: 'Available times are temporarily unavailable.' },
      { status: 500 }
    )
  }

  const slots = generateBookingSlots({
    durationMinutes: service.duration_minutes,
    windows: windows ?? [],
    appointments: appointments ?? [],
  })

  if (!slots.includes(time)) {
    return NextResponse.json(
      { error: 'That time was just taken. Please choose another available time.' },
      { status: 409 }
    )
  }

  const endTime = addMinutesToTime(time, service.duration_minutes)
  if (!endTime) {
    return NextResponse.json({ error: 'That appointment time is invalid.' }, { status: 400 })
  }

  const { data: appointment, error: insertError } = await admin
    .from('business_appointments')
    .insert({
      business_id: business.id,
      service_id: service.id,
      service_name_snapshot: service.name,
      customer_name: name,
      customer_email: email,
      customer_phone: phone || null,
      customer_note: note || null,
      appointment_date: date,
      start_time: time,
      end_time: endTime,
      status: 'pending',
      source: 'raisehub-site',
    })
    .select('id,status')
    .single()

  if (insertError) {
    if (insertError.code === '23P01') {
      return NextResponse.json(
        { error: 'That time was just taken. Please choose another available time.' },
        { status: 409 }
      )
    }

    console.error('Unable to create business appointment', {
      businessId: business.id,
      message: insertError.message,
    })
    return NextResponse.json(
      { error: 'Your appointment request could not be saved. Please try again.' },
      { status: 500 }
    )
  }

  const displayTime = (value: string) => {
    const [hoursText, minutes] = value.split(':')
    const hours = Number(hoursText)
    if (!Number.isFinite(hours)) return value
    return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`
  }

  const appointmentSummary = `${service.name} on ${date} at ${displayTime(time)}`

  const emailTasks = [
    sendNotificationEmail({
      to: email,
      recipientName: name,
      title: 'Appointment request received',
      message: `Your request for ${appointmentSummary} at ${resolved.site.site_title} was received. The business will confirm or cancel the request from RaiseHub.`,
      idempotencyKey: `business-booking-customer-request-${appointment.id}`,
      fromEmail: 'booking@raisehub.app',
      fromName: 'RaiseHub Booking',
      category: 'booking',
    }),
  ]

  if (business.email?.trim()) {
    emailTasks.push(
      sendNotificationEmail({
        to: business.email.trim(),
        recipientName: business.name,
        title: 'New appointment request',
        message: `${name} requested ${appointmentSummary}. Open the RaiseHub Scheduler to confirm or cancel it.`,
        actionUrl: '/dashboard/business/scheduler',
        actionLabel: 'Open Scheduler',
        idempotencyKey: `business-booking-owner-request-${appointment.id}`,
        fromEmail: 'booking@raisehub.app',
        fromName: 'RaiseHub Booking',
        category: 'booking',
      })
    )
  }

  const emailResults = await Promise.all(emailTasks)
  for (const result of emailResults) {
    if (result.status === 'failed') {
      console.error('Booking email delivery failed', {
        appointmentId: appointment.id,
        error: result.error,
      })
    }
  }

  return NextResponse.json(
    {
      success: true,
      appointmentId: appointment.id,
      status: appointment.status,
      message: 'Your appointment request was sent to the business for confirmation.',
    },
    { status: 201 }
  )
}
