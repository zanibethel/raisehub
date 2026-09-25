'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BUSINESS_APP_MODULES,
  getRecommendedBusinessModules,
  normalizeBookingConfig,
  normalizeEnabledModules,
  normalizeLocationConfig,
  normalizeMenuConfig,
  type BookingConfig,
  type BusinessAppModuleKey,
  type LocationConfig,
  type MenuConfig,
} from '@/lib/business-app-modules'

type Business = {
  id: string
  name: string
  description: string | null
  phone: string | null
  website_url: string | null
  email: string | null
  category: string | null
}

type BusinessSite = {
  id?: string
  business_id: string
  slug: string
  site_title: string
  hero_heading: string
  hero_copy: string
  about_heading: string
  about_copy: string
  phone: string
  address: string
  contact_email: string
  accent_color: string
  secondary_color: string
  background_color: string
  text_color: string
  section_order: string[]
  show_offers: boolean
  is_published: boolean
  logo_url: string
  hero_image_url: string
  hours_copy: string
  facebook_url: string
  instagram_url: string
  tiktok_url: string
  enabled_modules: BusinessAppModuleKey[]
  menu_config: MenuConfig
  location_config: LocationConfig
  booking_config: BookingConfig
}

type ThemeSuggestion = {
  name: string
  accent: string
  secondary: string
  background: string
  text: string
}

const sectionLabels: Record<string, string> = {
  hero: 'Hero & Branding',
  about: 'About',
  hours: 'Hours',
  offers: 'RaiseHub Offers',
  menu: 'Menu / Catalog',
  locations: 'Roaming Locations',
  booking: 'Book / Schedule',
  contact: 'Contact & Social',
}

const defaultOrder = ['hero', 'about', 'hours', 'offers', 'contact']
const moduleKeys: BusinessAppModuleKey[] = ['menu', 'locations', 'booking']

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

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

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r: 37, g: 99, b: 235 }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function mixColors(first: string, second: string, secondWeight: number) {
  const a = hexToRgb(first)
  const b = hexToRgb(second)
  const weight = Math.max(0, Math.min(1, secondWeight))
  return rgbToHex(
    a.r * (1 - weight) + b.r * weight,
    a.g * (1 - weight) + b.g * weight,
    a.b * (1 - weight) + b.b * weight
  )
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

function colorDistance(first: string, second: string) {
  const a = hexToRgb(first)
  const b = hexToRgb(second)
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

async function extractThemeSuggestions(file: File): Promise<ThemeSuggestion[]> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 72
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) {
          URL.revokeObjectURL(objectUrl)
          resolve([])
          return
        }

        context.clearRect(0, 0, size, size)
        context.drawImage(image, 0, 0, size, size)
        const pixels = context.getImageData(0, 0, size, size).data
        const buckets = new Map<string, number>()

        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3]
          if (alpha < 160) continue
          const r = pixels[index]
          const g = pixels[index + 1]
          const b = pixels[index + 2]
          if (r > 245 && g > 245 && b > 245) continue

          const step = 32
          const quantized = rgbToHex(
            Math.min(255, Math.round(r / step) * step),
            Math.min(255, Math.round(g / step) * step),
            Math.min(255, Math.round(b / step) * step)
          )
          buckets.set(quantized, (buckets.get(quantized) ?? 0) + 1)
        }

        const ranked = [...buckets.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([hex]) => hex)

        const distinct: string[] = []
        for (const color of ranked) {
          if (distinct.every((existing) => colorDistance(existing, color) > 70)) distinct.push(color)
          if (distinct.length === 4) break
        }

        const primary = distinct[0] ?? '#2563eb'
        const secondary = distinct[1] ?? mixColors(primary, '#0f172a', 0.48)
        const alternate = distinct[2] ?? mixColors(primary, '#ffffff', 0.28)
        const softBackground = mixColors('#ffffff', primary, 0.08)
        const darkBackground = mixColors('#0f172a', primary, 0.16)

        resolve([
          {
            name: 'Brand Match',
            accent: primary,
            secondary,
            background: '#ffffff',
            text: '#0f172a',
          },
          {
            name: 'Soft Brand',
            accent: primary,
            secondary: alternate,
            background: softBackground,
            text: readableText(softBackground),
          },
          {
            name: 'Bold Brand',
            accent: secondary,
            secondary: primary,
            background: darkBackground,
            text: readableText(darkBackground),
          },
        ])
      } catch {
        resolve([])
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve([])
    }

    image.src = objectUrl
  })
}

export default function BusinessWebsiteBuilderPage() {
  const supabase = useMemo(() => createClient(), [])
  const [business, setBusiness] = useState<Business | null>(null)
  const [site, setSite] = useState<BusinessSite | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<string | null>('hero')
  const [dragging, setDragging] = useState<string | null>(null)
  const [themeSuggestions, setThemeSuggestions] = useState<ThemeSuggestion[]>([])

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        window.location.href = '/login?next=/dashboard/business/website'
        return
      }

      const { data: memberships } = await supabase
        .from('business_memberships')
        .select('business_id,membership_role,status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .in('membership_role', ['owner', 'manager'])
        .limit(1)

      let businessId = memberships?.[0]?.business_id as string | undefined
      if (!businessId) {
        const { data: legacyBusiness } = await supabase.from('businesses').select('id').eq('legacy_profile_id', user.id).maybeSingle()
        businessId = legacyBusiness?.id
      }

      if (!businessId) {
        setMessage('Finish your business setup first, then come back here to build your website.')
        setLoading(false)
        return
      }

      const [{ data: businessData }, { data: siteData }] = await Promise.all([
        supabase.from('businesses').select('id,name,description,phone,website_url,email,category').eq('id', businessId).single(),
        supabase.from('business_sites').select('*').eq('business_id', businessId).maybeSingle(),
      ])

      if (!businessData) {
        setMessage('We could not load your business profile.')
        setLoading(false)
        return
      }

      const loadedBusiness = businessData as Business
      setBusiness(loadedBusiness)
      const loadedModules = normalizeEnabledModules(siteData?.enabled_modules)
      setSite(siteData ? {
        ...(siteData as BusinessSite),
        enabled_modules: loadedModules,
        section_order: normalizeOrder(siteData.section_order, loadedModules),
        menu_config: normalizeMenuConfig(siteData.menu_config),
        location_config: normalizeLocationConfig(siteData.location_config),
        booking_config: normalizeBookingConfig(siteData.booking_config),
        logo_url: siteData.logo_url ?? '',
        hero_image_url: siteData.hero_image_url ?? '',
        hours_copy: siteData.hours_copy ?? '',
        facebook_url: siteData.facebook_url ?? '',
        instagram_url: siteData.instagram_url ?? '',
        tiktok_url: siteData.tiktok_url ?? '',
        secondary_color: siteData.secondary_color ?? '#0f172a',
        background_color: siteData.background_color ?? '#ffffff',
        text_color: siteData.text_color ?? '#0f172a',
      } : {
        business_id: loadedBusiness.id,
        slug: slugify(loadedBusiness.name),
        site_title: loadedBusiness.name,
        hero_heading: loadedBusiness.name,
        hero_copy: loadedBusiness.description ?? '',
        about_heading: 'About us',
        about_copy: loadedBusiness.description ?? '',
        phone: loadedBusiness.phone ?? '',
        address: '',
        contact_email: loadedBusiness.email ?? '',
        accent_color: '#2563eb',
        secondary_color: '#0f172a',
        background_color: '#ffffff',
        text_color: '#0f172a',
        section_order: defaultOrder,
        show_offers: true,
        is_published: false,
        logo_url: '',
        hero_image_url: '',
        hours_copy: '',
        facebook_url: '',
        instagram_url: '',
        tiktok_url: '',
        enabled_modules: [],
        menu_config: normalizeMenuConfig(null),
        location_config: normalizeLocationConfig(null),
        booking_config: normalizeBookingConfig(null),
      })
      setLoading(false)
    }
    load()
  }, [supabase])

  function reorderSection(target: string) {
    if (!site || !dragging || dragging === target) return
    const next = [...site.section_order]
    const from = next.indexOf(dragging)
    const to = next.indexOf(target)
    if (from < 0 || to < 0) return
    next.splice(from, 1)
    next.splice(to, 0, dragging)
    setSite({ ...site, section_order: next })
    setDragging(null)
  }

  function toggleModule(moduleKey: BusinessAppModuleKey) {
    if (!site) return
    const enabled = site.enabled_modules.includes(moduleKey)
    const enabledModules = enabled
      ? site.enabled_modules.filter((item) => item !== moduleKey)
      : [...site.enabled_modules, moduleKey]
    const sectionOrder = enabled
      ? site.section_order.filter((item) => item !== moduleKey)
      : [...site.section_order, moduleKey]

    setSite({
      ...site,
      enabled_modules: enabledModules,
      section_order: normalizeOrder(sectionOrder, enabledModules),
    })

    if (!enabled) {
      setEditing(moduleKey)
      setMessage(`${BUSINESS_APP_MODULES[moduleKey].title} added. Fill in only what you need.`)
    } else {
      if (editing === moduleKey) setEditing(null)
      setMessage(`${BUSINESS_APP_MODULES[moduleKey].title} removed from the published experience.`)
    }
  }

  function applyTheme(theme: ThemeSuggestion) {
    if (!site) return
    setSite({
      ...site,
      accent_color: theme.accent,
      secondary_color: theme.secondary,
      background_color: theme.background,
      text_color: theme.text,
    })
    setMessage(`${theme.name} theme applied. Save your site to keep it.`)
  }

  async function uploadAsset(kind: 'logo' | 'hero', file: File) {
    if (!business || !site) return
    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file.')
      return
    }

    if (kind === 'logo') {
      const suggestions = await extractThemeSuggestions(file)
      setThemeSuggestions(suggestions)
    }

    setUploading(kind)
    setMessage(`Uploading ${kind === 'logo' ? 'logo' : 'hero image'}…`)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${business.id}/site/${kind}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('business-sites').upload(path, file, { upsert: false })
    if (error) {
      setMessage(error.message)
      setUploading(null)
      return
    }
    const { data } = supabase.storage.from('business-sites').getPublicUrl(path)
    setSite({ ...site, [kind === 'logo' ? 'logo_url' : 'hero_image_url']: data.publicUrl })
    setMessage(kind === 'logo' && themeSuggestions.length ? 'Logo uploaded. Choose a suggested theme below, then save your site.' : 'Image uploaded. Save your site to keep the change.')
    setUploading(null)
  }

  async function saveSite(publish?: boolean) {
    if (!site || !business) return
    const normalizedSlug = slugify(site.slug)
    if (!normalizedSlug) {
      setMessage('Choose a website address before saving.')
      return
    }

    setSaving(true)
    setMessage(publish ? 'Publishing your website + installable app…' : 'Saving your site…')
    const payload = {
      business_id: business.id,
      slug: normalizedSlug,
      site_title: site.site_title.trim() || business.name,
      hero_heading: site.hero_heading.trim(),
      hero_copy: site.hero_copy.trim(),
      about_heading: site.about_heading.trim() || 'About us',
      about_copy: site.about_copy.trim(),
      phone: site.phone.trim() || null,
      address: site.address.trim() || null,
      contact_email: site.contact_email.trim() || null,
      accent_color: site.accent_color,
      secondary_color: site.secondary_color,
      background_color: site.background_color,
      text_color: site.text_color,
      section_order: site.section_order,
      show_offers: site.show_offers,
      is_published: publish ?? site.is_published,
      logo_url: site.logo_url || null,
      hero_image_url: site.hero_image_url || null,
      hours_copy: site.hours_copy.trim() || null,
      facebook_url: site.facebook_url.trim() || null,
      instagram_url: site.instagram_url.trim() || null,
      tiktok_url: site.tiktok_url.trim() || null,
      enabled_modules: site.enabled_modules,
      menu_config: site.menu_config,
      location_config: site.location_config,
      booking_config: site.booking_config,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('business_sites').upsert(payload, { onConflict: 'business_id' }).select('*').single()
    if (error) {
      setMessage(error.message.includes('business_sites_slug_key') ? 'That website address is already taken. Try another.' : error.message)
    } else {
      const savedModules = normalizeEnabledModules(data.enabled_modules)
      setSite({
        ...(data as BusinessSite),
        enabled_modules: savedModules,
        section_order: normalizeOrder(data.section_order, savedModules),
        menu_config: normalizeMenuConfig(data.menu_config),
        location_config: normalizeLocationConfig(data.location_config),
        booking_config: normalizeBookingConfig(data.booking_config),
      })
      setMessage(publish ? 'Website + installable app published.' : 'Website saved.')
    }
    setSaving(false)
  }

  if (loading) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow">Loading website builder…</div></main>

  if (!site || !business) {
    return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow"><h1 className="text-2xl font-black text-slate-900">Business Website Builder</h1><p className="mt-3 text-slate-600">{message || 'Complete your business setup before creating a website.'}</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Back to Dashboard</Link></div></main>
  }

  const publicUrl = `/site/${site.slug}`
  const heroTextColor = readableText(site.accent_color)
  const recommendedModules = getRecommendedBusinessModules(business.category)
  const moduleCards = moduleKeys
    .map((key) => BUSINESS_APP_MODULES[key])
    .sort(
      (left, right) =>
        Number(recommendedModules.includes(right.key)) -
        Number(recommendedModules.includes(left.key))
    )

  const renderEditor = (key: string) => {
    if (editing !== key) return null
    if (key === 'hero') return <div className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">Logo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading !== null} onChange={(e) => e.target.files?.[0] && uploadAsset('logo', e.target.files[0])} className="mt-2 block w-full text-sm" /></label>
        <label className="block text-sm font-bold">Hero image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading !== null} onChange={(e) => e.target.files?.[0] && uploadAsset('hero', e.target.files[0])} className="mt-2 block w-full text-sm" /></label>
      </div>
      {themeSuggestions.length ? <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><div><p className="font-black text-blue-950">Suggested from your logo</p><p className="mt-1 text-sm text-blue-800">Choose one to apply the full palette. You can still fine-tune any color below.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{themeSuggestions.map((theme) => <button key={theme.name} type="button" onClick={() => applyTheme(theme)} className="overflow-hidden rounded-xl border border-blue-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5"><div className="flex h-10"><span className="flex-1" style={{ backgroundColor: theme.accent }} /><span className="flex-1" style={{ backgroundColor: theme.secondary }} /><span className="flex-1" style={{ backgroundColor: theme.background }} /></div><div className="p-3 text-xs font-black text-slate-800">{theme.name}</div></button>)}</div></div> : null}
      {(site.logo_url || site.hero_image_url) ? <div className="flex flex-wrap gap-3">{site.logo_url ? <button type="button" onClick={() => { setSite({ ...site, logo_url: '' }); setThemeSuggestions([]) }} className="text-sm font-bold text-red-600">Remove logo</button> : null}{site.hero_image_url ? <button type="button" onClick={() => setSite({ ...site, hero_image_url: '' })} className="text-sm font-bold text-red-600">Remove hero image</button> : null}</div> : null}
      <label className="block text-sm font-bold">Site title<input value={site.site_title} onChange={(e) => setSite({ ...site, site_title: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
      <label className="block text-sm font-bold">Main heading<input value={site.hero_heading} onChange={(e) => setSite({ ...site, hero_heading: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
      <label className="block text-sm font-bold">Intro<textarea value={site.hero_copy} onChange={(e) => setSite({ ...site, hero_copy: e.target.value })} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
      <div><p className="text-sm font-black">Theme colors</p><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4"><label className="text-xs font-bold">Primary<input type="color" value={site.accent_color} onChange={(e) => setSite({ ...site, accent_color: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white p-1" /></label><label className="text-xs font-bold">Secondary<input type="color" value={site.secondary_color} onChange={(e) => setSite({ ...site, secondary_color: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white p-1" /></label><label className="text-xs font-bold">Background<input type="color" value={site.background_color} onChange={(e) => setSite({ ...site, background_color: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white p-1" /></label><label className="text-xs font-bold">Text<input type="color" value={site.text_color} onChange={(e) => setSite({ ...site, text_color: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white p-1" /></label></div></div>
    </div>
    if (key === 'about') return <div className="mt-5 space-y-4"><label className="block text-sm font-bold">Heading<input value={site.about_heading} onChange={(e) => setSite({ ...site, about_heading: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label><label className="block text-sm font-bold">About your business<textarea value={site.about_copy} onChange={(e) => setSite({ ...site, about_copy: e.target.value })} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label></div>
    if (key === 'hours') return <div className="mt-5"><label className="block text-sm font-bold">Business hours<textarea value={site.hours_copy} onChange={(e) => setSite({ ...site, hours_copy: e.target.value })} rows={5} placeholder={'Mon–Fri: 9 AM–6 PM\nSat: 10 AM–4 PM\nSun: Closed'} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label></div>
    if (key === 'offers') return <div className="mt-5"><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={site.show_offers} onChange={(e) => setSite({ ...site, show_offers: e.target.checked })} /> Automatically show active RaiseHub offers</label><p className="mt-2 text-sm text-slate-500">Offers stay synced with the business’s RaiseHub account.</p></div>
    if (key === 'menu') return <div className="mt-5 space-y-4">
      <label className="block text-sm font-bold">Section heading<input value={site.menu_config.heading} onChange={(e) => setSite({ ...site, menu_config: { ...site.menu_config, heading: e.target.value } })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
      <label className="block text-sm font-bold">Short intro<textarea value={site.menu_config.intro} onChange={(e) => setSite({ ...site, menu_config: { ...site.menu_config, intro: e.target.value } })} rows={2} className="mt-2 w-full rounded-xl border border-slate-300 p-3" placeholder="Optional" /></label>
      <div className="space-y-3">
        {site.menu_config.items.map((item, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">Item / service<input value={item.name} onChange={(e) => { const items = [...site.menu_config.items]; items[index] = { ...item, name: e.target.value }; setSite({ ...site, menu_config: { ...site.menu_config, items } }) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" /></label>
            <label className="text-sm font-bold">Price<input value={item.price} onChange={(e) => { const items = [...site.menu_config.items]; items[index] = { ...item, price: e.target.value }; setSite({ ...site, menu_config: { ...site.menu_config, items } }) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" placeholder="$12" /></label>
            <label className="text-sm font-bold">Category<input value={item.category} onChange={(e) => { const items = [...site.menu_config.items]; items[index] = { ...item, category: e.target.value }; setSite({ ...site, menu_config: { ...site.menu_config, items } }) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" placeholder="Entrées, Services, Products…" /></label>
            <label className="text-sm font-bold">Description<input value={item.description} onChange={(e) => { const items = [...site.menu_config.items]; items[index] = { ...item, description: e.target.value }; setSite({ ...site, menu_config: { ...site.menu_config, items } }) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" placeholder="Optional" /></label>
          </div>
          <button type="button" onClick={() => setSite({ ...site, menu_config: { ...site.menu_config, items: site.menu_config.items.filter((_, itemIndex) => itemIndex !== index) } })} className="mt-3 text-sm font-bold text-red-600">Remove item</button>
        </div>)}
      </div>
      <button type="button" onClick={() => setSite({ ...site, menu_config: { ...site.menu_config, items: [...site.menu_config.items, { name: '', price: '', description: '', category: '' }] } })} className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-black text-blue-700">+ Add item</button>
    </div>
    if (key === 'locations') return <div className="mt-5 space-y-4">
      <label className="block text-sm font-bold">Section heading<input value={site.location_config.heading} onChange={(e) => setSite({ ...site, location_config: { ...site.location_config, heading: e.target.value } })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
      <label className="block text-sm font-bold">Short intro<textarea value={site.location_config.intro} onChange={(e) => setSite({ ...site, location_config: { ...site.location_config, intro: e.target.value } })} rows={2} className="mt-2 w-full rounded-xl border border-slate-300 p-3" placeholder="Where to find us this week…" /></label>
      <div className="space-y-3">
        {site.location_config.stops.map((stop, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">Stop name<input value={stop.name} onChange={(e) => { const stops = [...site.location_config.stops]; stops[index] = { ...stop, name: e.target.value }; setSite({ ...site, location_config: { ...site.location_config, stops } }) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" placeholder="Friday lunch" /></label>
            <label className="text-sm font-bold">When<input value={stop.schedule} onChange={(e) => { const stops = [...site.location_config.stops]; stops[index] = { ...stop, schedule: e.target.value }; setSite({ ...site, location_config: { ...site.location_config, stops } }) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" placeholder="Fri 11 AM–2 PM" /></label>
            <label className="text-sm font-bold sm:col-span-2">Location / address<input value={stop.address} onChange={(e) => { const stops = [...site.location_config.stops]; stops[index] = { ...stop, address: e.target.value }; setSite({ ...site, location_config: { ...site.location_config, stops } }) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" /></label>
            <label className="text-sm font-bold sm:col-span-2">Note<input value={stop.note} onChange={(e) => { const stops = [...site.location_config.stops]; stops[index] = { ...stop, note: e.target.value }; setSite({ ...site, location_config: { ...site.location_config, stops } }) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" placeholder="Optional" /></label>
          </div>
          <button type="button" onClick={() => setSite({ ...site, location_config: { ...site.location_config, stops: site.location_config.stops.filter((_, stopIndex) => stopIndex !== index) } })} className="mt-3 text-sm font-bold text-red-600">Remove stop</button>
        </div>)}
      </div>
      <button type="button" onClick={() => setSite({ ...site, location_config: { ...site.location_config, stops: [...site.location_config.stops, { name: '', address: '', schedule: '', note: '' }] } })} className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-black text-blue-700">+ Add stop</button>
    </div>
    if (key === 'booking') return <div className="mt-5 space-y-4">
      <label className="block text-sm font-bold">Section heading<input value={site.booking_config.heading} onChange={(e) => setSite({ ...site, booking_config: { ...site.booking_config, heading: e.target.value } })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
      <label className="block text-sm font-bold">Short intro<textarea value={site.booking_config.intro} onChange={(e) => setSite({ ...site, booking_config: { ...site.booking_config, intro: e.target.value } })} rows={2} className="mt-2 w-full rounded-xl border border-slate-300 p-3" placeholder="Choose a time that works for you." /></label>
      <label className="block text-sm font-bold">Booking link<input value={site.booking_config.url} onChange={(e) => setSite({ ...site, booking_config: { ...site.booking_config, url: e.target.value } })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" placeholder="https://..." /></label>
      <label className="block text-sm font-bold">Button label<input value={site.booking_config.label} onChange={(e) => setSite({ ...site, booking_config: { ...site.booking_config, label: e.target.value } })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
      <p className="text-sm leading-6 text-slate-500">This connects the scheduler you already use. A native RaiseHub appointment scheduler can plug into this same module later.</p>
    </div>
    return <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">Phone<input value={site.phone} onChange={(e) => setSite({ ...site, phone: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label><label className="block text-sm font-bold">Email<input value={site.contact_email} onChange={(e) => setSite({ ...site, contact_email: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label><label className="block text-sm font-bold sm:col-span-2">Address<input value={site.address} onChange={(e) => setSite({ ...site, address: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label><label className="block text-sm font-bold">Facebook<input value={site.facebook_url} onChange={(e) => setSite({ ...site, facebook_url: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" placeholder="https://facebook.com/..." /></label><label className="block text-sm font-bold">Instagram<input value={site.instagram_url} onChange={(e) => setSite({ ...site, instagram_url: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" placeholder="https://instagram.com/..." /></label><label className="block text-sm font-bold">TikTok<input value={site.tiktok_url} onChange={(e) => setSite({ ...site, tiktok_url: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" placeholder="https://tiktok.com/@..." /></label></div>
  }

  const renderPreviewSection = (key: string) => {
    if (key === 'hero') return <div key={key} className="relative overflow-hidden p-6" style={{ color: heroTextColor, backgroundColor: site.accent_color, backgroundImage: site.hero_image_url ? `linear-gradient(rgba(15,23,42,.42),rgba(15,23,42,.42)),url(${site.hero_image_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>{site.logo_url ? <img src={site.logo_url} alt="" className="mb-4 h-14 max-w-40 object-contain" /> : null}<h2 className="text-3xl font-black">{site.hero_heading || business.name}</h2><p className="mt-3 leading-6 opacity-95">{site.hero_copy || 'Tell customers what makes your business worth visiting.'}</p></div>
    if (key === 'about') return <div key={key} className="p-6" style={{ backgroundColor: site.background_color, color: site.text_color }}><h3 className="text-xl font-black">{site.about_heading}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 opacity-80">{site.about_copy || 'Add a short description of your business.'}</p></div>
    if (key === 'hours') return site.hours_copy ? <div key={key} className="border-t p-6" style={{ borderColor: mixColors(site.background_color, site.text_color, 0.15), backgroundColor: site.background_color, color: site.text_color }}><h3 className="font-black">Hours</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 opacity-80">{site.hours_copy}</p></div> : null
    if (key === 'offers') return site.show_offers ? <div key={key} className="border-t p-6" style={{ borderColor: mixColors(site.background_color, site.text_color, 0.15), backgroundColor: site.background_color, color: site.text_color }}><div className="rounded-2xl p-4" style={{ backgroundColor: mixColors(site.background_color, site.secondary_color, 0.14) }}><p className="font-black" style={{ color: site.secondary_color }}>RaiseHub Offers</p><p className="mt-1 text-sm opacity-80">Active offers will appear here automatically.</p></div></div> : null
    if (key === 'menu') return <div key={key} className="border-t p-6" style={{ borderColor: mixColors(site.background_color, site.text_color, 0.15), backgroundColor: site.background_color, color: site.text_color }}><h3 className="text-xl font-black">{site.menu_config.heading}</h3>{site.menu_config.intro ? <p className="mt-2 text-sm opacity-75">{site.menu_config.intro}</p> : null}<div className="mt-4 space-y-3">{site.menu_config.items.length ? site.menu_config.items.slice(0, 4).map((item, index) => <div key={index} className="rounded-xl border p-3" style={{ borderColor: mixColors(site.background_color, site.text_color, 0.12) }}><div className="flex items-start justify-between gap-3"><div><p className="font-black">{item.name || 'Untitled item'}</p>{item.category ? <p className="mt-0.5 text-xs opacity-60">{item.category}</p> : null}</div>{item.price ? <strong>{item.price}</strong> : null}</div>{item.description ? <p className="mt-2 text-xs opacity-70">{item.description}</p> : null}</div>) : <p className="text-sm opacity-60">Add menu or catalog items.</p>}</div></div>
    if (key === 'locations') return <div key={key} className="border-t p-6" style={{ borderColor: mixColors(site.background_color, site.text_color, 0.15), backgroundColor: site.background_color, color: site.text_color }}><h3 className="text-xl font-black">{site.location_config.heading}</h3>{site.location_config.intro ? <p className="mt-2 text-sm opacity-75">{site.location_config.intro}</p> : null}<div className="mt-4 space-y-3">{site.location_config.stops.length ? site.location_config.stops.slice(0, 3).map((stop, index) => <div key={index} className="rounded-xl border p-3" style={{ borderColor: mixColors(site.background_color, site.text_color, 0.12) }}><p className="font-black">{stop.name || 'Upcoming stop'}</p>{stop.schedule ? <p className="mt-1 text-sm">{stop.schedule}</p> : null}{stop.address ? <p className="mt-1 text-xs opacity-70">{stop.address}</p> : null}</div>) : <p className="text-sm opacity-60">Add upcoming locations.</p>}</div></div>
    if (key === 'booking') return <div key={key} className="border-t p-6" style={{ borderColor: mixColors(site.background_color, site.text_color, 0.15), backgroundColor: site.background_color, color: site.text_color }}><h3 className="text-xl font-black">{site.booking_config.heading}</h3>{site.booking_config.intro ? <p className="mt-2 text-sm opacity-75">{site.booking_config.intro}</p> : null}<span className="mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-black" style={{ backgroundColor: site.accent_color, color: heroTextColor }}>{site.booking_config.label || 'Book appointment'}</span></div>
    if (key === 'contact') return <div key={key} className="border-t p-6 text-sm" style={{ borderColor: mixColors(site.background_color, site.text_color, 0.15), backgroundColor: site.background_color, color: site.text_color }}><h3 className="mb-2 font-black">Contact</h3>{site.phone ? <p>{site.phone}</p> : null}{site.address ? <p>{site.address}</p> : null}{site.contact_email ? <p>{site.contact_email}</p> : null}</div>
    return null
  }

  return <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 px-5 py-8 text-slate-900 sm:px-8">
    <section className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">RaiseHub Website + App Builder</p><h1 className="mt-2 text-3xl font-black">Build once for web + app</h1><p className="mt-2 text-slate-600">Create {business.name}'s content once. RaiseHub uses it for the website and installable app.</p></div><div className="flex gap-2"><Link href="/dashboard" className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700">Dashboard</Link>{site.is_published ? <Link href={publicUrl} target="_blank" className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white">Open Website / App</Link> : null}</div></div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Website address</h2><p className="mt-1 text-sm text-slate-500">Current: raisehub.app/site/{site.slug || 'your-business'} · When wildcard DNS is enabled this slug also becomes {site.slug || 'your-business'}.raisehub.app.</p><input value={site.slug} onChange={(e) => setSite({ ...site, slug: slugify(e.target.value) })} className="mt-4 w-full rounded-xl border border-slate-300 p-3" placeholder="your-business" /></section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Features</p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">Useful for {business.category || 'your business'}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Add only what customers need. Enabled features become normal draggable sections below.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {moduleCards.map((module) => {
                const enabled = site.enabled_modules.includes(module.key)
                const recommended = recommendedModules.includes(module.key)
                return <div key={module.key} className={`rounded-2xl border p-4 ${enabled ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-black text-slate-950">{module.title}</p>
                    {recommended ? <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">Suggested</span> : null}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{module.description}</p>
                  <button type="button" onClick={() => toggleModule(module.key)} className={`mt-4 w-full rounded-xl px-3 py-2.5 text-sm font-black ${enabled ? 'border border-red-200 bg-white text-red-700' : 'bg-blue-600 text-white'}`}>
                    {enabled ? 'Remove' : 'Add feature'}
                  </button>
                </div>
              })}
            </div>
          </section>

          {site.section_order.map((key) => <section key={key} draggable onDragStart={() => setDragging(key)} onDragOver={(e) => e.preventDefault()} onDrop={() => reorderSection(key)} className={`rounded-3xl border bg-white p-5 shadow-sm transition ${dragging === key ? 'border-blue-400 opacity-60' : 'border-slate-200'}`}><div className="flex items-center gap-3"><button type="button" aria-label={`Drag ${sectionLabels[key]}`} className="cursor-grab rounded-lg border border-slate-200 px-2 py-1 text-slate-400">⋮⋮</button><div className="min-w-0 flex-1"><h2 className="font-black">{sectionLabels[key]}</h2><p className="text-xs text-slate-500">Drag to rearrange this section on the live site.</p></div><button type="button" onClick={() => setEditing(editing === key ? null : key)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">{editing === key ? 'Close' : 'Edit'}</button></div>{renderEditor(key)}</section>)}

          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Your outputs</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">One build, two ready-to-use experiences</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Publishing once creates the public website and an installable business app from the same content.
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${site.is_published ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                {site.is_published ? 'Published' : 'Draft'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                <p className="text-sm font-black text-slate-950">Website</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Shareable link at raisehub.app/site/{site.slug || 'your-business'}.
                </p>
              </div>
              <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                <p className="text-sm font-black text-slate-950">Installable app</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Customers can add it to their Home Screen with the business name, icon and standalone launch.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-sm font-black text-indigo-950">App Store / Google Play</p>
              <p className="mt-1 text-xs leading-5 text-indigo-800">
                A packaged native version will be an optional upgrade later. It will reuse this same business content instead of making you rebuild the app.
              </p>
            </div>

            {site.is_published ? (
              <Link
                href={publicUrl}
                target="_blank"
                className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white"
              >
                Open install page
              </Link>
            ) : null}
          </section>

          <div className="flex flex-wrap gap-3"><button type="button" disabled={saving} onClick={() => saveSite(false)} className="rounded-xl border border-blue-300 bg-white px-5 py-3 font-black text-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Draft'}</button><button type="button" disabled={saving} onClick={() => saveSite(true)} className="rounded-xl bg-green-600 px-5 py-3 font-black text-white disabled:opacity-50">{site.is_published ? 'Save & Keep Published' : 'Publish Website + App'}</button></div>
          {message ? <p className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{message}</p> : null}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start"><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"><div className="border-b border-slate-100 px-5 py-3"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Live-order preview</p></div>{site.section_order.map(renderPreviewSection)}</div></aside>
      </div>
    </section>
  </main>
}
