export type BusinessSiteAppManifestInput = {
  slug: string
  siteTitle: string
  accentColor?: string | null
  backgroundColor?: string | null
  logoUrl?: string | null
}

function safeHex(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function shortName(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length <= 24) return normalized
  return normalized.slice(0, 23).trimEnd() + '…'
}

export function buildBusinessSiteAppManifest(input: BusinessSiteAppManifestInput) {
  const slug = input.slug.trim().toLowerCase()
  const name = input.siteTitle.trim() || 'Business'
  const iconSrc = input.logoUrl?.trim() || '/default-business-logo.png'

  return {
    id: `/site/${slug}`,
    name,
    short_name: shortName(name),
    description: `${name} business app powered by RaiseHub`,
    start_url: `/site/${slug}?source=installed-app`,
    scope: '/',
    display: 'standalone',
    background_color: safeHex(input.backgroundColor, '#ffffff'),
    theme_color: safeHex(input.accentColor, '#2563eb'),
    icons: [
      {
        src: iconSrc,
        sizes: 'any',
        purpose: 'any',
      },
    ],
  }
}
