export const BUSINESS_REFERRAL_COOKIE = 'raisehub-business-referral'
export const BUSINESS_REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function normalizeBusinessReferralToken(
  value: string | null | undefined
): string | null {
  const token = value?.trim().toLowerCase() ?? ''
  return /^[a-f0-9]{12}$/.test(token) ? token : null
}

export function readBusinessReferralCookie(cookieString: string): string | null {
  const prefix = `${BUSINESS_REFERRAL_COOKIE}=`
  const raw = cookieString
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length)

  return normalizeBusinessReferralToken(raw ? decodeURIComponent(raw) : null)
}

export function getBusinessReferralCookieDomain(hostname: string): string | undefined {
  const normalized = hostname.trim().toLowerCase().split(':')[0]
  if (normalized === 'raisehub.app' || normalized.endsWith('.raisehub.app')) {
    return '.raisehub.app'
  }
  return undefined
}

export function rememberBusinessReferralInBrowser(token: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const normalized = normalizeBusinessReferralToken(token)
  if (!normalized) return

  const parts = [
    `${BUSINESS_REFERRAL_COOKIE}=${encodeURIComponent(normalized)}`,
    'Path=/',
    `Max-Age=${BUSINESS_REFERRAL_COOKIE_MAX_AGE}`,
    'SameSite=Lax',
  ]

  if (window.location.protocol === 'https:') parts.push('Secure')
  const domain = getBusinessReferralCookieDomain(window.location.hostname)
  if (domain) parts.push(`Domain=${domain}`)

  document.cookie = parts.join('; ')
}

export function clearBusinessReferralInBrowser(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const parts = [
    `${BUSINESS_REFERRAL_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
  ]

  if (window.location.protocol === 'https:') parts.push('Secure')
  const domain = getBusinessReferralCookieDomain(window.location.hostname)
  if (domain) parts.push(`Domain=${domain}`)

  document.cookie = parts.join('; ')
}
