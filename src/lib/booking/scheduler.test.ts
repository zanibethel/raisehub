import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addMinutesToTime,
  dateWithinBookingWindow,
  generateBookingSlots,
  weekdayFromDate,
} from './scheduler'

test('generates slots inside recurring availability', () => {
  const slots = generateBookingSlots({
    durationMinutes: 60,
    windows: [{ start_time: '09:00', end_time: '12:00' }],
    appointments: [],
    stepMinutes: 30,
  })

  assert.deepEqual(slots, ['09:00', '09:30', '10:00', '10:30', '11:00'])
})

test('removes slots that would overlap an existing booking', () => {
  const slots = generateBookingSlots({
    durationMinutes: 60,
    windows: [{ start_time: '09:00', end_time: '12:00' }],
    appointments: [
      { start_time: '10:00', end_time: '11:00', status: 'confirmed' },
    ],
    stepMinutes: 30,
  })

  assert.deepEqual(slots, ['09:00', '11:00'])
})

test('cancelled bookings do not block availability', () => {
  const slots = generateBookingSlots({
    durationMinutes: 60,
    windows: [{ start_time: '09:00', end_time: '11:00' }],
    appointments: [
      { start_time: '09:00', end_time: '10:00', status: 'cancelled' },
    ],
  })

  assert.equal(slots[0], '09:00')
})

test('date helpers stay date-only and deterministic', () => {
  assert.equal(weekdayFromDate('2026-09-25'), 5)
  assert.equal(addMinutesToTime('09:30', 60), '10:30')
  assert.equal(
    dateWithinBookingWindow(
      '2026-09-26',
      60,
      new Date('2026-09-25T20:00:00Z')
    ),
    true
  )
})
