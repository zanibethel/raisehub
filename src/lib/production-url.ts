const DEFAULT_PRODUCTION_SITE_URL = 'https://raisehub.app'

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_PRODUCTION_SITE_URL

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  const url = new URL(withProtocol)

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Production site URL must use HTTP or HTTPS.')
  }

  if (url.protocol === 'http:' && !isLocalHostname(url.hostname)) {
    url.protocol = 'https:'
  }

  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  url.search = ''
  url.hash = ''

  return url.toString().replace(/\/$/, '')
}

export function getProductionSiteUrl(): string {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_PRODUCTION_SITE_URL ?? DEFAULT_PRODUCTION_SITE_URL
  )
}

export function buildProductionUrl(
  pathname = '/',
  params?: URLSearchParams | Record<string, string | null | undefined>
): string {
  const base = `${getProductionSiteUrl()}/`
  const url = new URL(pathname.replace(/^\//, ''), base)

  if (params instanceof URLSearchParams) {
    params.forEach((value, key) => url.searchParams.set(key, value))
  } else if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  return url.toString()
}
