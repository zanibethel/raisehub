import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

import { getProductionSiteUrl } from '@/lib/production-url'

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.freebusy',
] as const

function stateSecret() {
  const secret = process.env.GOOGLE_CALENDAR_OAUTH_STATE_SECRET
  if (!secret) throw new Error('Missing GOOGLE_CALENDAR_OAUTH_STATE_SECRET.')
  return secret
}

function encode(value: string) {
  return Buffer.from(value).toString('base64url')
}

function decode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payload: string) {
  return createHmac('sha256', stateSecret()).update(payload).digest('base64url')
}

export function createGoogleCalendarState(input: {
  businessId: string
  userId: string
  returnTo: string
}) {
  const payload = encode(JSON.stringify({ ...input, issuedAt: Date.now() }))
  return `${payload}.${sign(payload)}`
}

export function readGoogleCalendarState(value: string) {
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return null
  const expected = sign(payload)
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null

  try {
    const parsed = JSON.parse(decode(payload)) as {
      businessId: string
      userId: string
      returnTo: string
      issuedAt: number
    }
    if (!parsed.businessId || !parsed.userId || !parsed.returnTo || !parsed.issuedAt) return null
    if (Date.now() - parsed.issuedAt > 10 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

export function googleCalendarAuthorizationUrl(state: string) {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  if (!clientId) throw new Error('Missing GOOGLE_CALENDAR_CLIENT_ID.')

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', `${getProductionSiteUrl()}/api/integrations/google-calendar/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('scope', GOOGLE_CALENDAR_SCOPES.join(' '))
  url.searchParams.set('state', state)
  return url.toString()
}
