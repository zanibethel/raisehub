import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const publicBookingRoute = readFileSync(
  join(
    process.cwd(),
    'src/app/api/public/business-sites/[slug]/booking/route.ts'
  ),
  'utf8'
)

const appointmentActionRoute = readFileSync(
  join(
    process.cwd(),
    'src/app/api/business/scheduler/appointments/[id]/route.ts'
  ),
  'utf8'
)

test('public booking rechecks availability and relies on the overlap constraint', () => {
  assert.ok(publicBookingRoute.includes('generateBookingSlots'))
  assert.ok(publicBookingRoute.includes("insert({"))
  assert.ok(publicBookingRoute.includes("insertError.code === '23P01'"))
  assert.ok(publicBookingRoute.includes("'business_booking:create:demo'"))
  assert.ok(publicBookingRoute.includes("'business_booking:create:live'"))
})

test('appointment actions require an authenticated authorized business member', () => {
  assert.ok(appointmentActionRoute.includes('supabase.auth.getUser()'))
  assert.ok(appointmentActionRoute.includes("from('business_memberships')"))
  assert.ok(appointmentActionRoute.includes("membership_role"))
  assert.ok(appointmentActionRoute.includes("['owner', 'manager']"))
  assert.ok(appointmentActionRoute.includes("actorProfile?.role !== 'owner'"))
  assert.ok(appointmentActionRoute.includes('status: 403'))
})

test('appointment state changes are constrained and notify customers', () => {
  assert.ok(appointmentActionRoute.includes("pending: ['confirmed', 'cancelled']"))
  assert.ok(appointmentActionRoute.includes("confirmed: ['completed', 'cancelled']"))
  assert.ok(appointmentActionRoute.includes('sendNotificationEmail'))
  assert.ok(appointmentActionRoute.includes("'Appointment confirmed'"))
  assert.ok(appointmentActionRoute.includes("'Appointment cancelled'"))
})
