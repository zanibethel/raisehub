'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  show_offers: boolean
  is_published: boolean
  section_order: string[]
  logo_url: string | null
  hero_image_url: string | null
  hours_copy: string | null
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
}

type Offer = {
  id: string
  title: string
  description: string | null
  benefit: string | null
}

const defaultOrder = ['hero', 'about', 'hours', 'offers', 'contact']

function normalizeOrder(value: unknown) {
  const incoming = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  return [...incoming.filter((item) => defaultOrder.includes(item)), ...defaultOrder.filter((item) => !incoming.includes(item))]
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

export default function PublicBusinessMiniSitePage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const supabase = useMemo(() => createClient(), [])
  const [site, setSite] = useState<BusinessSite | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!slug) return
      const { data } = await supabase
        .from('business_sites')
        .select('business_id,slug,site_title,hero_heading,hero_copy,about_heading,about_copy,phone,address,contact_email,accent_color,show_offers,is_published,section_order,logo_url,hero_image_url,hours_copy,facebook_url,instagram_url,tiktok_url')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle()

      if (!data) {
        setLoading(false)
        return
      }

      const loadedSite = { ...(data as BusinessSite), section_order: normalizeOrder(data.section_order) }
      setSite(loadedSite)

      if (loadedSite.show_offers) {
        const now = new Date().toISOString()
        const { data: offerRows } = await supabase
          .from('offers')
          .select('id,title,description,benefit')
          .eq('business_id', loadedSite.business_id)
          .eq('is_active', true)
          .or(`starts_at.is.null,starts_at.lte.${now}`)
          .or(`ends_at.is.null,ends_at.gte.${now}`)
          .limit(6)
        if (offerRows) setOffers(offerRows as Offer[])
      }
      setLoading(false)
    }

    load()
  }, [slug, supabase])

  if (loading) return <main className="min-h-screen bg-slate-50 p-8 text-slate-700">Loading…</main>

  if (!site) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black text-slate-900">This site is not published yet.</h1><p className="mt-3 text-slate-600">The business may still be building its RaiseHub website.</p><Link href="/" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Visit RaiseHub</Link></div></main>
  }

  const socialLinks = [
    ['Facebook', safeExternalUrl(site.facebook_url)],
    ['Instagram', safeExternalUrl(site.instagram_url)],
    ['TikTok', safeExternalUrl(site.tiktok_url)],
  ].filter((item): item is [string, string] => Boolean(item[1]))

  const renderSection = (key: string) => {
    if (key === 'hero') return <section key={key} className="relative overflow-hidden px-5 py-20 text-white" style={{ backgroundColor: site.accent_color, backgroundImage: site.hero_image_url ? `linear-gradient(rgba(15,23,42,.56),rgba(15,23,42,.56)),url(${site.hero_image_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}><div className="mx-auto max-w-5xl">{site.logo_url ? <img src={site.logo_url} alt={`${site.site_title} logo`} className="mb-6 h-20 max-w-64 object-contain" /> : null}<p className="text-sm font-black uppercase tracking-[0.18em] opacity-80">Local business</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">{site.hero_heading || site.site_title}</h1>{site.hero_copy ? <p className="mt-6 max-w-3xl text-lg leading-8 opacity-95">{site.hero_copy}</p> : null}</div></section>

    if (key === 'about') return <section key={key} className="px-5 py-14"><div className="mx-auto max-w-5xl"><h2 className="text-3xl font-black">{site.about_heading}</h2><p className="mt-5 max-w-3xl whitespace-pre-line text-lg leading-8 text-slate-600">{site.about_copy}</p></div></section>

    if (key === 'hours') return site.hours_copy ? <section key={key} className="bg-slate-50 px-5 py-14"><div className="mx-auto max-w-5xl"><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Visit us</p><h2 className="mt-2 text-3xl font-black">Business hours</h2><p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-600">{site.hours_copy}</p></div></section> : null

    if (key === 'offers') return site.show_offers ? <section key={key} className="bg-green-50 px-5 py-14"><div className="mx-auto max-w-5xl"><p className="text-sm font-black uppercase tracking-[0.18em] text-green-700">RaiseHub offers</p><h2 className="mt-2 text-3xl font-black">Current customer offers</h2>{offers.length ? <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{offers.map((offer) => <Link key={offer.id} href={`/offers/${offer.id}`} className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><h3 className="text-lg font-black">{offer.title}</h3>{offer.benefit ? <p className="mt-2 font-bold text-green-700">{offer.benefit}</p> : null}{offer.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{offer.description}</p> : null}</Link>)}</div> : <p className="mt-5 text-slate-600">No active offers are posted right now. Check back soon.</p>}</div></section> : null

    return <section key={key} className="px-5 py-14"><div className="mx-auto max-w-5xl rounded-3xl bg-slate-950 p-8 text-white sm:p-10"><p className="text-sm font-black uppercase tracking-[0.18em] text-blue-300">Contact</p><h2 className="mt-2 text-3xl font-black">Get in touch</h2><div className="mt-6 space-y-2 text-slate-200">{site.phone ? <p><a href={`tel:${site.phone}`} className="hover:underline">{site.phone}</a></p> : null}{site.contact_email ? <p><a href={`mailto:${site.contact_email}`} className="underline">{site.contact_email}</a></p> : null}{site.address ? <p>{site.address}</p> : null}</div>{socialLinks.length ? <div className="mt-6 flex flex-wrap gap-3">{socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">{label}</a>)}</div> : null}</div></section>
  }

  return <main className="min-h-screen bg-white text-slate-900"><header className="border-b border-slate-200 bg-white/95 px-5 py-4"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4"><strong className="text-lg font-black">{site.site_title}</strong><span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Powered by RaiseHub</span></div></header>{site.section_order.map(renderSection)}</main>
}
