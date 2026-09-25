import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const appointmentActionRoute = readFileSync(
  join(
    process.cwd(),
    'src/app/api/business/scheduler/appointments/[id]/route.ts'
  ),
  'utf8'
)

const schedulerEmailActionPage = readFileSync(
  join(
    process.cwd(),
    'src/app/dashboard/business/scheduler/action/page.tsx'
  ),
  'utf8'
)

const publicBookingRoute = readFileSync(
  join(
    process.cwd(),
    'src/app/api/public/business-sites/[slug]/booking/route.ts'
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


test('booking notification emails expose safe accept and cancel actions', () => {
  assert.ok(publicBookingRoute.includes("label: 'Accept booking'"))
  assert.ok(publicBookingRoute.includes("label: 'Cancel booking'"))
  assert.ok(publicBookingRoute.includes('/dashboard/business/scheduler/action?appointment='))
  assert.ok(publicBookingRoute.includes("fromEmail: 'booking@raisehub.app'"))
})

test('email action links require an explicit confirmation before changing status', () => {
  assert.ok(schedulerEmailActionPage.includes("'use client'"))
  assert.ok(schedulerEmailActionPage.includes('Yes, accept booking'))
  assert.ok(schedulerEmailActionPage.includes('Yes, cancel booking'))
  assert.ok(schedulerEmailActionPage.includes("method: 'PATCH'"))
  assert.ok(
    schedulerEmailActionPage.includes(
      '/api/business/scheduler/appointments/'
    )
  )
})
