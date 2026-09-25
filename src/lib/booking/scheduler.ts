export type BookingWindow = {
  start_time: string
  end_time: string
}

export type ExistingBooking = {
  start_time: string
  end_time: string
  status?: string
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }
  return hours * 60 + minutes
}

export function minutesToTime(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function addMinutesToTime(value: string, minutesToAdd: number) {
  const minutes = timeToMinutes(value)
  if (minutes === null) return null
  const end = minutes + minutesToAdd
  if (end <= minutes || end > 24 * 60) return null
  return minutesToTime(end)
}

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number
) {
  return startA < endB && endA > startB
}

export function generateBookingSlots(input: {
  durationMinutes: number
  windows: BookingWindow[]
  appointments: ExistingBooking[]
  stepMinutes?: number
}) {
  const duration = Math.max(15, Math.min(480, Math.round(input.durationMinutes)))
  const step = Math.max(15, Math.min(120, Math.round(input.stepMinutes ?? 15)))

  const occupied = input.appointments
    .filter(
      (appointment) =>
        !appointment.status ||
        appointment.status === 'pending' ||
        appointment.status === 'confirmed'
    )
    .map((appointment) => {
      const start = timeToMinutes(appointment.start_time)
      const end = timeToMinutes(appointment.end_time)
      return start === null || end === null ? null : { start, end }
    })
    .filter((range): range is { start: number; end: number } => Boolean(range))

  const slots = new Set<string>()

  for (const window of input.windows) {
    const windowStart = timeToMinutes(window.start_time)
    const windowEnd = timeToMinutes(window.end_time)
    if (windowStart === null || windowEnd === null || windowEnd <= windowStart) {
      continue
    }

    for (
      let start = windowStart;
      start + duration <= windowEnd;
      start += step
    ) {
      const end = start + duration
      if (
        occupied.some((range) =>
          overlaps(start, end, range.start, range.end)
        )
      ) {
        continue
      }
      slots.add(minutesToTime(start))
    }
  }

  return [...slots].sort()
}

export function weekdayFromDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  return date.getUTCDay()
}

export function dateWithinBookingWindow(
  value: string,
  maxDaysAhead = 60,
  now = new Date()
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const requested = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(requested.getTime())) return false

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)
  )
  const maximum = new Date(today)
  maximum.setUTCDate(maximum.getUTCDate() + maxDaysAhead)

  return requested >= today && requested <= maximum
}
