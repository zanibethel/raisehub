'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Business = {
  id: string
  name: string
  description: string | null
  phone: string | null
  website_url: string | null
  email: string | null
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
  section_order: string[]
  show_offers: boolean
  is_published: boolean
}

const defaultOrder = ['hero', 'about', 'offers', 'contact']

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function BusinessWebsiteBuilderPage() {
  const supabase = useMemo(() => createClient(), [])
  const [business, setBusiness] = useState<Business | null>(null)
  const [site, setSite] = useState<BusinessSite | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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
        const { data: legacyBusiness } = await supabase
          .from('businesses')
          .select('id')
          .eq('legacy_profile_id', user.id)
          .maybeSingle()
        businessId = legacyBusiness?.id
      }

      if (!businessId) {
        setMessage('Finish your business setup first, then come back here to build your website.')
        setLoading(false)
        return
      }

      const [{ data: businessData }, { data: siteData }] = await Promise.all([
        supabase
          .from('businesses')
          .select('id,name,description,phone,website_url,email')
          .eq('id', businessId)
          .single(),
        supabase
          .from('business_sites')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle(),
      ])

      if (!businessData) {
        setMessage('We could not load your business profile.')
        setLoading(false)
        return
      }

      const loadedBusiness = businessData as Business
      setBusiness(loadedBusiness)
      setSite(
        siteData
          ? ({ ...siteData, section_order: Array.isArray(siteData.section_order) ? siteData.section_order : defaultOrder } as BusinessSite)
          : {
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
              section_order: defaultOrder,
              show_offers: true,
              is_published: false,
            }
      )
      setLoading(false)
    }

    load()
  }, [supabase])

  async function saveSite(publish?: boolean) {
    if (!site || !business) return
    const normalizedSlug = slugify(site.slug)
    if (!normalizedSlug) {
      setMessage('Choose a website address before saving.')
      return
    }

    setSaving(true)
    setMessage(publish ? 'Publishing your site…' : 'Saving your site…')

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
      section_order: site.section_order,
      show_offers: site.show_offers,
      is_published: publish ?? site.is_published,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('business_sites')
      .upsert(payload, { onConflict: 'business_id' })
      .select('*')
      .single()

    if (error) {
      setMessage(error.message.includes('business_sites_slug_key') ? 'That website address is already taken. Try another.' : error.message)
    } else {
      setSite({ ...(data as BusinessSite), section_order: (data.section_order as string[]) ?? defaultOrder })
      setMessage(publish ? 'Website published.' : 'Website saved.')
    }
    setSaving(false)
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow">Loading website builder…</div></main>
  }

  if (!site || !business) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow">
          <h1 className="text-2xl font-black text-slate-900">Business Website Builder</h1>
          <p className="mt-3 text-slate-600">{message || 'Complete your business setup before creating a website.'}</p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Back to Dashboard</Link>
        </div>
      </main>
    )
  }

  const publicUrl = `/site/${site.slug}`

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 px-5 py-8 text-slate-900 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">RaiseHub Website Builder</p>
            <h1 className="mt-2 text-3xl font-black">Build a simple site for {business.name}</h1>
            <p className="mt-2 text-slate-600">Start with a RaiseHub-hosted page now. Custom subdomains come next.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700">Dashboard</Link>
            {site.is_published ? <Link href={publicUrl} target="_blank" className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white">View Live Site</Link> : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Website address</h2>
              <p className="mt-1 text-sm text-slate-500">Your current address will be raisehub.com/site/{site.slug || 'your-business'}</p>
              <input value={site.slug} onChange={(e) => setSite({ ...site, slug: slugify(e.target.value) })} className="mt-4 w-full rounded-xl border border-slate-300 p-3" placeholder="your-business" />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Hero</h2>
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-bold">Site title<input value={site.site_title} onChange={(e) => setSite({ ...site, site_title: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
                <label className="block text-sm font-bold">Main heading<input value={site.hero_heading} onChange={(e) => setSite({ ...site, hero_heading: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
                <label className="block text-sm font-bold">Intro<textarea value={site.hero_copy} onChange={(e) => setSite({ ...site, hero_copy: e.target.value })} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">About</h2>
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-bold">Heading<input value={site.about_heading} onChange={(e) => setSite({ ...site, about_heading: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
                <label className="block text-sm font-bold">About your business<textarea value={site.about_copy} onChange={(e) => setSite({ ...site, about_copy: e.target.value })} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Contact</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold">Phone<input value={site.phone} onChange={(e) => setSite({ ...site, phone: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
                <label className="block text-sm font-bold">Email<input value={site.contact_email} onChange={(e) => setSite({ ...site, contact_email: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
                <label className="block text-sm font-bold sm:col-span-2">Address<input value={site.address} onChange={(e) => setSite({ ...site, address: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
              </div>
              <label className="mt-4 flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={site.show_offers} onChange={(e) => setSite({ ...site, show_offers: e.target.checked })} /> Automatically show active RaiseHub offers</label>
            </section>

            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={saving} onClick={() => saveSite(false)} className="rounded-xl border border-blue-300 bg-white px-5 py-3 font-black text-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Draft'}</button>
              <button type="button" disabled={saving} onClick={() => saveSite(true)} className="rounded-xl bg-green-600 px-5 py-3 font-black text-white disabled:opacity-50">{site.is_published ? 'Save & Keep Published' : 'Publish Website'}</button>
            </div>
            {message ? <p className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{message}</p> : null}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
              <div className="p-6 text-white" style={{ backgroundColor: site.accent_color }}>
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">Preview</p>
                <h2 className="mt-3 text-3xl font-black">{site.hero_heading || business.name}</h2>
                <p className="mt-3 leading-6 opacity-90">{site.hero_copy || 'Tell customers what makes your business worth visiting.'}</p>
              </div>
              <div className="space-y-5 p-6">
                <div><h3 className="text-xl font-black">{site.about_heading}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{site.about_copy || 'Add a short description of your business.'}</p></div>
                {site.show_offers ? <div className="rounded-2xl bg-green-50 p-4"><p className="font-black text-green-800">RaiseHub Offers</p><p className="mt-1 text-sm text-green-700">Active offers will appear here automatically.</p></div> : null}
                <div className="text-sm text-slate-600">{site.phone ? <p>{site.phone}</p> : null}{site.address ? <p>{site.address}</p> : null}{site.contact_email ? <p>{site.contact_email}</p> : null}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
