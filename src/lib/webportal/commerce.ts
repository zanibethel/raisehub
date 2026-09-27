export const WEBPORTAL_AD_FLOW = 'webportal_ad'
export const WEBPORTAL_SUPPORT_FLOW = 'webportal_support'

export const WEBPORTAL_AD_PLANS = {
  seven_day: {
    code: 'seven_day',
    label: '7 days',
    amountCents: 1000,
    durationDays: 7,
    recurring: false,
  },
  month_once: {
    code: 'month_once',
    label: '30 days',
    amountCents: 2500,
    durationDays: 30,
    recurring: false,
  },
  month_recurring: {
    code: 'month_recurring',
    label: 'Monthly',
    amountCents: 2500,
    durationDays: 30,
    recurring: true,
  },
} as const

export type WebPortalAdPlanCode = keyof typeof WEBPORTAL_AD_PLANS

export function isWebPortalAdPlanCode(
  value: unknown
): value is WebPortalAdPlanCode {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(WEBPORTAL_AD_PLANS, value)
  )
}

export function cleanWebPortalText(
  value: unknown,
  maxLength: number
): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export function normalizeWebPortalDestinationUrl(value: unknown) {
  const raw = cleanWebPortalText(value, 500)
  if (!raw) return null

  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

export function normalizeWebPortalSupportAmount(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return null

  const cents = Math.round(amount * 100)
  if (cents < 300 || cents > 50_000) return null
  return cents
}

export function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
