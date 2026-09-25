import 'server-only'

import { decryptCalendarToken, encryptCalendarToken } from './token-crypto'
import { createAdminClient } from '@/lib/supabase/admin'

type Appointment = {
  id: string
  business_id: string
  service_name_snapshot: string
  customer_name: string
  customer_email: string
  customer_phone?: string | null
  customer_note?: string | null
  appointment_date: string
  start_time: string
  end_time: string
}

async function validAccessToken(connection: any, admin: any) {
  if (connection.encrypted_access_token && connection.token_expires_at && new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) {
    return decryptCalendarToken(connection.encrypted_access_token)
  }
  if (!connection.encrypted_refresh_token) throw new Error('Google Calendar refresh token is missing.')

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Google Calendar OAuth is not configured.')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptCalendarToken(connection.encrypted_refresh_token),
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  })
  const payload = await response.json() as { access_token?: string; expires_in?: number; error?: string }
  if (!response.ok || !payload.access_token) throw new Error(payload.error || 'Google token refresh failed.')

  await admin.from('business_calendar_connections').update({
    encrypted_access_token: encryptCalendarToken(payload.access_token),
    token_expires_at: new Date(Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000).toISOString(),
    connection_status: 'connected',
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', connection.id)

  return payload.access_token
}

function eventBody(appointment: Appointment, businessName: string) {
  const description = [
    `RaiseHub appointment for ${appointment.customer_name}`,
    `Email: ${appointment.customer_email}`,
    appointment.customer_phone ? `Phone: ${appointment.customer_phone}` : '',
    appointment.customer_note ? `Note: ${appointment.customer_note}` : '',
    `RaiseHub appointment ID: ${appointment.id}`,
  ].filter(Boolean).join('\n')

  return {
    summary: `${appointment.service_name_snapshot} — ${appointment.customer_name}`,
    description,
    start: { dateTime: `${appointment.appointment_date}T${appointment.start_time}` },
    end: { dateTime: `${appointment.appointment_date}T${appointment.end_time}` },
    extendedProperties: { private: { raisehubAppointmentId: appointment.id, raisehubBusinessId: appointment.business_id, raisehubBusinessName: businessName } },
  }
}

export async function syncAppointmentToGoogleCalendar(input: {
  appointment: Appointment
  businessName: string
  action: 'confirmed' | 'cancelled'
}) {
  const admin = createAdminClient() as any
  const { data: connection } = await admin.from('business_calendar_connections').select('*').eq('business_id', input.appointment.business_id).eq('provider', 'google').eq('connection_status', 'connected').maybeSingle()
  if (!connection) return { status: 'not_connected' as const }

  const { data: mapping } = await admin.from('business_appointment_calendar_events').select('*').eq('appointment_id', input.appointment.id).eq('connection_id', connection.id).maybeSingle()

  try {
    const token = await validAccessToken(connection, admin)
    const calendarId = encodeURIComponent(connection.calendar_id || 'primary')
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }

    if (input.action === 'cancelled') {
      if (!mapping?.provider_event_id) return { status: 'nothing_to_delete' as const }
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(mapping.provider_event_id)}`, { method: 'DELETE', headers, cache: 'no-store' })
      if (!response.ok && response.status !== 404) throw new Error(`Google Calendar delete failed (${response.status}).`)
      await admin.from('business_appointment_calendar_events').update({ sync_status: 'deleted', last_error: null, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', mapping.id)
      return { status: 'deleted' as const }
    }

    const body = JSON.stringify(eventBody(input.appointment, input.businessName))
    const endpoint = mapping?.provider_event_id
      ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(mapping.provider_event_id)}`
      : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`
    const response = await fetch(endpoint, { method: mapping?.provider_event_id ? 'PATCH' : 'POST', headers, body, cache: 'no-store' })
    const event = await response.json().catch(() => ({})) as { id?: string; error?: { message?: string } }
    if (!response.ok || !event.id) throw new Error(event.error?.message || `Google Calendar sync failed (${response.status}).`)

    await admin.from('business_appointment_calendar_events').upsert({
      appointment_id: input.appointment.id,
      connection_id: connection.id,
      provider_event_id: event.id,
      sync_status: 'synced',
      last_error: null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'appointment_id,connection_id' })
    await admin.from('business_calendar_connections').update({ last_sync_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('id', connection.id)
    return { status: 'synced' as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Calendar sync failed.'
    await admin.from('business_calendar_connections').update({ connection_status: 'needs_attention', last_error: message, updated_at: new Date().toISOString() }).eq('id', connection.id)
    if (mapping?.id) await admin.from('business_appointment_calendar_events').update({ sync_status: 'failed', last_error: message, updated_at: new Date().toISOString() }).eq('id', mapping.id)
    console.error('Google Calendar appointment sync failed', { appointmentId: input.appointment.id, message })
    return { status: 'failed' as const, error: message }
  }
}
