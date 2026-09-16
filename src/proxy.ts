import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

const RESERVED_RAISEHUB_SUBDOMAINS = new Set([
  'www',
  'business',
  'organization',
  'supporter',
  'owner',
  'demo',
])

function getBusinessSiteSlug(hostname: string) {
  const host = hostname.split(':')[0].toLowerCase()
  if (!host.endsWith('.raisehub.app')) return null

  const subdomain = host.slice(0, -'.raisehub.app'.length)
  if (!subdomain || subdomain.includes('.') || RESERVED_RAISEHUB_SUBDOMAINS.has(subdomain)) {
    return null
  }

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain) ? subdomain : null
}

export async function proxy(request: NextRequest) {
  const slug = getBusinessSiteSlug(request.headers.get('host') ?? '')

  if (slug && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = `/site/${slug}`
    return NextResponse.rewrite(url)
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
