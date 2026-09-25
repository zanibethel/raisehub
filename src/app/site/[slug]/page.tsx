'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import InstallBusinessApp from './install-business-app'
import {
  normalizeBookingConfig,
  normalizeEnabledModules,
  normalizeLocationConfig,
  normalizeMenuConfig,
  type BookingConfig,
  type BusinessAppModuleKey,
  type LocationConfig,
  type MenuConfig,
} from '@/lib/business-app-modules'

type BusinessSite = {
  business_id: string
  slug: string
  site_title: string
  hero_heading: string
  hero_copy: string
  about_heading: string
  about_copy: string
  phone: string | null
  address: string | null
  contact_email: string | null
  accent_color: string
  secondary_color: string
  background_color: string
  text_color: string
  show_offers: boolean
  is_published: boolean
  section_order: string[]
  logo_url: string | null
  hero_image_url: string | null
  hours_copy: string | null
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  enabled_modules: BusinessAppModuleKey[]
  menu_config: MenuConfig
  location_config: LocationConfig
  booking_config: BookingConfig
}

type Offer = {
  id: string
  title: string
  description: string | null
  benefit: string | null
}

type PublicBusinessSitePayload = {
  site: BusinessSite
  offers: Offer[]
  websiteBenefits?: {
    hideRaiseHubBranding?: boolean
  }
}

const defaultOrder = ['hero', 'about', 'hours', 'offers', 'contact']

function normalizeOrder(
  value: unknown,
  enabledModules: BusinessAppModuleKey[] = []
) {
  const incoming = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
  const allowed = new Set([...defaultOrder, ...enabledModules])
  const ordered = incoming.filter((item) => allowed.has(item))
  return [
    ...ordered,
    ...defaultOrder.filter((item) => !ordered.includes(item)),
    ...enabledModules.filter((item) => !ordered.includes(item)),
  ]
}

function safeExternalUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r: 37, g: 99, b: 235 }
  return { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`
}

function mixColors(first: string, second: string, secondWeight: number) {
  const a = hexToRgb(first)
  const b = hexToRgb(second)
  const weight = Math.max(0, Math.min(1, secondWeight))
  return rgbToHex(a.r * (1 - weight) + b.r * weight, a.g * (1 - weight) + b.g * weight, a.b * (1 - weight) + b.b * weight)
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const channels = [r, g, b].map((value) => {
    const normalized = value / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = luminance(first)
  const secondLuminance = luminance(second)
  const light = Math.max(firstLuminance, secondLuminance)
  const dark = Math.min(firstLuminance, secondLuminance)
  return (light + 0.05) / (dark + 0.05)
}

function readableText(background: string) {
  return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#0f172a') ? '#ffffff' : '#0f172a'
}

export default function PublicBusinessMiniSitePage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const [site, setSite] = useState<BusinessSite | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [hideRaiseHubBranding, setHideRaiseHubBranding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!slug) return

      try {
        const response = await fetch(`/api/public/business-sites/${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          setLoading(false)
          return
        }

        const payload = (await response.json()) as PublicBusinessSitePayload
        const enabledModules = normalizeEnabledModules(payload.site.enabled_modules)
        setSite({
          ...payload.site,
          enabled_modules: enabledModules,
          section_order: normalizeOrder(payload.site.section_order, enabledModules),
          menu_config: normalizeMenuConfig(payload.site.menu_config),
          location_config: normalizeLocationConfig(payload.site.location_config),
          booking_config: normalizeBookingConfig(payload.site.booking_config),
        })
        setOffers(payload.offers ?? [])
        setHideRaiseHubBranding(payload.websiteBenefits?.hideRaiseHubBranding === true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [slug])

  if (loading) return <main className="min-h-screen bg-slate-50 p-8 text-slate-700">Loading…</main>

  if (!site) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black text-slate-900">This site is not published yet.</h1><p className="mt-3 text-slate-600">The business may still be building its RaiseHub website.</p><Link href="/" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Visit RaiseHub</Link></div></main>
  }

  const heroText = readableText(site.accent_color)
  const mutedText = mixColors(site.background_color, site.text_color, 0.7)
  const divider = mixColors(site.background_color, site.text_color, 0.14)
  const offerSurface = mixColors(site.background_color, site.secondary_color, 0.12)
  const contactText = readableText(site.secondary_color)

  const socialLinks = [
    ['Facebook', safeExternalUrl(site.facebook_url)],
    ['Instagram', safeExternalUrl(site.instagram_url)],
    ['TikTok', safeExternalUrl(site.tiktok_url)],
  ].filter((item): item is [string, string] => Boolean(item[1]))

  const renderSection = (key: string) => {
    if (key === 'hero') return <section key={key} className="relative overflow-hidden px-5 py-20" style={{ color: heroText, backgroundColor: site.accent_color, backgroundImage: site.hero_image_url ? `linear-gradient(rgba(15,23,42,.46),rgba(15,23,42,.46)),url(${site.hero_image_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}><div className="mx-auto max-w-5xl">{site.logo_url ? <img src={site.logo_url} alt={`${site.site_title} logo`} className="mb-6 h-20 max-w-64 object-contain" /> : null}<p className="text-sm font-black uppercase tracking-[0.18em] opacity-80">Local business</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">{site.hero_heading || site.site_title}</h1>{site.hero_copy ? <p className="mt-6 max-w-3xl text-lg leading-8 opacity-95">{site.hero_copy}</p> : null}</div></section>

    if (key === 'about') return <section key={key} className="px-5 py-14" style={{ backgroundColor: site.background_color, color: site.text_color }}><div className="mx-auto max-w-5xl"><h2 className="text-3xl font-black">{site.about_heading}</h2><p className="mt-5 max-w-3xl whitespace-pre-line text-lg leading-8" style={{ color: mutedText }}>{site.about_copy}</p></div></section>

    if (key === 'hours') return site.hours_copy ? <section key={key} className="border-t px-5 py-14" style={{ borderColor: divider, backgroundColor: mixColors(site.background_color, site.secondary_color, 0.05), color: site.text_color }}><div className="mx-auto max-w-5xl"><p className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: site.secondary_color }}>Visit us</p><h2 className="mt-2 text-3xl font-black">Business hours</h2><p className="mt-5 whitespace-pre-line text-lg leading-8" style={{ color: mutedText }}>{site.hours_copy}</p></div></section> : null

    if (key === 'offers') return site.show_offers ? <section key={key} className="border-t px-5 py-14" style={{ borderColor: divider, backgroundColor: offerSurface, color: site.text_color }}><div className="mx-auto max-w-5xl"><p className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: site.secondary_color }}>RaiseHub offers</p><h2 className="mt-2 text-3xl font-black">Current customer offers</h2>{offers.length ? <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{offers.map((offer) => <Link key={offer.id} href={`/offers/${offer.id}`} className="rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: divider, backgroundColor: site.background_color, color: site.text_color }}><h3 className="text-lg font-black">{offer.title}</h3>{offer.benefit ? <p className="mt-2 font-bold" style={{ color: site.secondary_color }}>{offer.benefit}</p> : null}{offer.description ? <p className="mt-2 text-sm leading-6" style={{ color: mutedText }}>{offer.description}</p> : null}</Link>)}</div> : <p className="mt-5" style={{ color: mutedText }}>No active offers are posted right now. Check back soon.</p>}</div></section> : null

    if (key === 'menu') {
      if (!site.enabled_modules.includes('menu') || !site.menu_config.items.length) return null
      const grouped = new Map<string, typeof site.menu_config.items>()
      for (const item of site.menu_config.items) {
        const category = item.category.trim() || 'Featured'
        const current = grouped.get(category) ?? []
        current.push(item)
        grouped.set(category, current)
      }
      return <section key={key} className="border-t px-5 py-14" style={{ borderColor: divider, backgroundColor: site.background_color, color: site.text_color }}><div className="mx-auto max-w-5xl"><p className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: site.secondary_color }}>Explore</p><h2 className="mt-2 text-3xl font-black">{site.menu_config.heading}</h2>{site.menu_config.intro ? <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: mutedText }}>{site.menu_config.intro}</p> : null}<div className="mt-8 space-y-8">{[...grouped.entries()].map(([category, items]) => <div key={category}><h3 className="text-lg font-black" style={{ color: site.secondary_color }}>{category}</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{items.map((item, index) => <div key={`${category}-${index}`} className="rounded-2xl border p-5" style={{ borderColor: divider, backgroundColor: mixColors(site.background_color, site.secondary_color, 0.04) }}><div className="flex items-start justify-between gap-4"><div><h4 className="font-black">{item.name || 'Item'}</h4>{item.description ? <p className="mt-1 text-sm leading-6" style={{ color: mutedText }}>{item.description}</p> : null}</div>{item.price ? <strong className="shrink-0">{item.price}</strong> : null}</div></div>)}</div></div>)}</div></div></section>
    }

    if (key === 'locations') {
      if (!site.enabled_modules.includes('locations') || !site.location_config.stops.length) return null
      return <section key={key} className="border-t px-5 py-14" style={{ borderColor: divider, backgroundColor: mixColors(site.background_color, site.secondary_color, 0.05), color: site.text_color }}><div className="mx-auto max-w-5xl"><p className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: site.secondary_color }}>Find us</p><h2 className="mt-2 text-3xl font-black">{site.location_config.heading}</h2>{site.location_config.intro ? <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: mutedText }}>{site.location_config.intro}</p> : null}<div className="mt-7 grid gap-4 md:grid-cols-2">{site.location_config.stops.map((stop, index) => <article key={index} className="rounded-2xl border p-5" style={{ borderColor: divider, backgroundColor: site.background_color }}><div className="flex items-start justify-between gap-4"><h3 className="font-black">{stop.name || 'Upcoming stop'}</h3>{stop.schedule ? <span className="text-sm font-bold" style={{ color: site.secondary_color }}>{stop.schedule}</span> : null}</div>{stop.address ? <p className="mt-3 text-sm">{stop.address}</p> : null}{stop.note ? <p className="mt-2 text-sm leading-6" style={{ color: mutedText }}>{stop.note}</p> : null}{stop.address ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl border px-4 py-2 text-sm font-black" style={{ borderColor: divider }}>Directions</a> : null}</article>)}</div></div></section>
    }

    if (key === 'booking') {
      if (!site.enabled_modules.includes('booking')) return null
      const bookingUrl = safeExternalUrl(site.booking_config.url)
      if (!bookingUrl) return null
      return <section key={key} className="border-t px-5 py-14" style={{ borderColor: divider, backgroundColor: site.background_color, color: site.text_color }}><div className="mx-auto max-w-5xl rounded-3xl p-8 sm:p-10" style={{ backgroundColor: site.secondary_color, color: contactText }}><p className="text-sm font-black uppercase tracking-[0.18em] opacity-75">Schedule</p><h2 className="mt-2 text-3xl font-black">{site.booking_config.heading}</h2>{site.booking_config.intro ? <p className="mt-4 max-w-2xl text-lg leading-8 opacity-90">{site.booking_config.intro}</p> : null}<a href={bookingUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-black" style={{ color: site.secondary_color }}>{site.booking_config.label || 'Book appointment'}</a></div></section>
    }

    if (key === 'contact') return <section key={key} className="px-5 py-14" style={{ backgroundColor: site.background_color }}><div className="mx-auto max-w-5xl rounded-3xl p-8 sm:p-10" style={{ backgroundColor: site.secondary_color, color: contactText }}><p className="text-sm font-black uppercase tracking-[0.18em] opacity-75">Contact</p><h2 className="mt-2 text-3xl font-black">Get in touch</h2><div className="mt-6 space-y-2 opacity-90">{site.phone ? <p><a href={`tel:${site.phone}`} className="hover:underline">{site.phone}</a></p> : null}{site.contact_email ? <p><a href={`mailto:${site.contact_email}`} className="underline">{site.contact_email}</a></p> : null}{site.address ? <p>{site.address}</p> : null}</div>{socialLinks.length ? <div className="mt-6 flex flex-wrap gap-3">{socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="rounded-full border px-4 py-2 text-sm font-bold hover:opacity-80" style={{ borderColor: mixColors(site.secondary_color, contactText, 0.25) }}>{label}</a>)}</div> : null}</div></section>

    return null
  }

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: site.background_color, color: site.text_color }}
    >
      <header
        className="border-b px-5 py-4"
        style={{ borderColor: divider, backgroundColor: site.background_color }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <strong className="text-lg font-black">{site.site_title}</strong>
          {hideRaiseHubBranding ? null : (
            <span
              className="text-xs font-bold uppercase tracking-[0.14em]"
              style={{ color: mutedText }}
            >
              Powered by RaiseHub
            </span>
          )}
        </div>
      </header>

      {site.section_order.map(renderSection)}

      <InstallBusinessApp
        slug={site.slug}
        siteTitle={site.site_title}
        themeColor={site.accent_color}
        logoUrl={site.logo_url}
      />
    </main>
  )
}