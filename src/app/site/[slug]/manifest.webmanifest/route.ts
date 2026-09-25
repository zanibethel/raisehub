import { NextResponse } from 'next/server'

import { buildBusinessSiteAppManifest } from '@/lib/business-site-app-manifest'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ slug: string }>
}

type PublicBusinessSitePayload = {
  site?: {
    slug?: string
    site_title?: string
    accent_color?: string | null
    background_color?: string | null
    logo_url?: string | null
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params
  const normalizedSlug = slug.trim().toLowerCase()

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    return new NextResponse(null, { status: 404 })
  }

  const publicSiteUrl = new URL(
    `/api/public/business-sites/${encodeURIComponent(normalizedSlug)}`,
    request.url
  )

  const response = await fetch(publicSiteUrl, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    return new NextResponse(null, {
      status: response.status === 404 ? 404 : 503,
    })
  }

  const payload = (await response.json()) as PublicBusinessSitePayload
  const site = payload.site

  if (!site?.site_title) {
    return new NextResponse(null, { status: 404 })
  }

  const manifest = buildBusinessSiteAppManifest({
    slug: site.slug || normalizedSlug,
    siteTitle: site.site_title,
    accentColor: site.accent_color,
    backgroundColor: site.background_color,
    logoUrl: site.logo_url,
  })

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'content-type': 'application/manifest+json; charset=utf-8',
      'cache-control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  })
}
