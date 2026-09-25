import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params
  const normalizedSlug = slug.trim().toLowerCase()

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    return new NextResponse(null, { status: 404 })
  }

  const siteUrl = new URL(
    `/api/public/business-sites/${encodeURIComponent(normalizedSlug)}`,
    request.url
  )

  let name = 'RaiseHub Business Admin'
  let icon = '/default-business-logo.png'
  let themeColor = '#2563eb'

  try {
    const response = await fetch(siteUrl, { cache: 'no-store' })
    if (response.ok) {
      const payload = await response.json() as {
        site?: {
          site_title?: string
          logo_url?: string | null
          accent_color?: string | null
        }
      }
      if (payload.site?.site_title) name = `${payload.site.site_title} Admin`
      if (payload.site?.logo_url) icon = payload.site.logo_url
      if (payload.site?.accent_color && /^#[0-9a-f]{6}$/i.test(payload.site.accent_color)) {
        themeColor = payload.site.accent_color
      }
    }
  } catch {
    // The admin manifest may still use safe generic RaiseHub branding.
  }

  return new NextResponse(
    JSON.stringify({
      id: `/site/${normalizedSlug}/admin`,
      name,
      short_name: name.length <= 24 ? name : 'Business Admin',
      description: 'Manage this RaiseHub business website, app, locations, and appointments.',
      start_url: `/site/${normalizedSlug}/admin?source=installed-admin`,
      scope: '/',
      display: 'standalone',
      background_color: '#f8fafc',
      theme_color: themeColor,
      icons: [{ src: icon, sizes: 'any', purpose: 'any' }],
    }),
    {
      headers: {
        'content-type': 'application/manifest+json; charset=utf-8',
        'cache-control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    }
  )
}
