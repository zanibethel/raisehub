/**
 * RaiseHub Offer Status Rules
 *
 * Central source of truth for offer lifecycle status.
 * No AI required.
 */

export type OfferStatus =
  | 'scheduled'
  | 'active'
  | 'expiring-soon'
  | 'paused'
  | 'expired'
  | 'archived'

export type OfferStatusTone =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'rose'
  | 'red'
  | 'slate'

export type OfferStatusResult = {
  status: OfferStatus
  label: string
  tone: OfferStatusTone
  description: string
  daysUntilStart: number | null
  daysUntilExpiration: number | null
}

export type OfferStatusInput = {
  startsAt?: string | null
  endsAt?: string | null
  isActive?: boolean | null
  isArchived?: boolean | null
  now?: Date
}

const DAY_IN_MS = 1000 * 60 * 60 * 24
const EXPIRING_SOON_DAYS = 14

function startOfDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate()
  )
}

function parseDate(value?: string | null) {
  if (!value) return null

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getDayDifference(from: Date, to: Date) {
  const fromDay = startOfDay(from)
  const toDay = startOfDay(to)

  return Math.ceil(
    (toDay.getTime() - fromDay.getTime()) / DAY_IN_MS
  )
}

export function getOfferStatus(
  input: OfferStatusInput
): OfferStatusResult {
  const now = input.now ?? new Date()
  const startsAt = parseDate(input.startsAt)
  const endsAt = parseDate(input.endsAt)

  const daysUntilStart = startsAt
    ? getDayDifference(now, startsAt)
    : null

  const daysUntilExpiration = endsAt
    ? getDayDifference(now, endsAt)
    : null

  if (input.isArchived) {
    return {
      status: 'archived',
      label: 'Archived',
      tone: 'slate',
      description:
        'This offer is stored for history and is hidden from members.',
      daysUntilStart,
      daysUntilExpiration,
    }
  }

  if (endsAt && daysUntilExpiration !== null && daysUntilExpiration < 0) {
    return {
      status: 'expired',
      label: 'Expired',
      tone: 'red',
      description:
        'This offer has expired and is no longer visible to members.',
      daysUntilStart,
      daysUntilExpiration,
    }
  }

  if (input.isActive === false) {
    return {
      status: 'paused',
      label: 'Paused',
      tone: 'rose',
      description:
        'This offer is hidden from members until it is resumed.',
      daysUntilStart,
      daysUntilExpiration,
    }
  }

  if (startsAt && daysUntilStart !== null && daysUntilStart > 0) {
    return {
      status: 'scheduled',
      label: 'Scheduled',
      tone: 'blue',
      description:
        'This offer will become available on its scheduled start date.',
      daysUntilStart,
      daysUntilExpiration,
    }
  }

  if (
    endsAt &&
    daysUntilExpiration !== null &&
    daysUntilExpiration >= 0 &&
    daysUntilExpiration <= EXPIRING_SOON_DAYS
  ) {
    return {
      status: 'expiring-soon',
      label: 'Expiring Soon',
      tone: 'yellow',
      description:
        'This offer is still active but should be reviewed before it ends.',
      daysUntilStart,
      daysUntilExpiration,
    }
  }

  return {
    status: 'active',
    label: 'Active',
    tone: 'green',
    description:
      'This offer is currently available to RaiseHub members.',
    daysUntilStart,
    daysUntilExpiration,
  }
}

export function isPubliclyAvailableOffer(
  input: OfferStatusInput
) {
  const result = getOfferStatus(input)

  return (
    result.status === 'active' ||
    result.status === 'expiring-soon'
  )
}