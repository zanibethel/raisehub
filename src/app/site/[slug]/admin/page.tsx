'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import InstallBusinessAdminApp from './install-admin-app'
import {
  normalizeEnabledModules,
  normalizeLocationConfig,
  type BusinessAppModuleKey,
  type LocationConfig,
} from '@/lib/business-app-modules'
import { createClient } from '@/lib/supabase/client'

type AdminSection = 'overview' | 'details' | 'locations' | 'schedule' | 'integrations'

type BusinessSite = {
  id: string
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
  hours_copy: string | null
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  logo_url: string | null
  accent_color: string
  is_published: boolean
  enabled_modules: BusinessAppModuleKey[]
  location_config: LocationConfig
}

type Business = {
  id: string
  name: string
  category: string | null
}

type AvailabilityWindow = {
  id: string
  business_id: string
  weekday: number
  start_time: string
  end_time: string
  is_active: boolean
}

type Appointment = {
  id: string
  business_id: string
  service_name_snapshot: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_note: string | null
  appointment_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function dateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayTime(value: string) {
  const [hoursText, minutes] = value.split(':')
  const hours = Number(hoursText)
  if (!Number.isFinite(hours)) return value
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`
}

function displayDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function BusinessSiteAdminPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''
  const supabase = useMemo(() => createClient(), [])

  const [site, setSite] = useState<BusinessSite | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [activeSection, setActiveSection] = useState<AdminSection>('overview')
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState('')

  const [weekday, setWeekday] = useState(1)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [showLocations, setShowLocations] = useState(false)

  async function refreshSchedule(businessId: string) {
    const [{ data: availabilityRows }, { data: appointmentRows }] = await Promise.all([
      supabase
        .from('business_booking_availability')
        .select('*')
        .eq('business_id', businessId)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true }),
      supabase
        .from('business_appointments')
        .select('*')
        .eq('business_id', businessId)
        .gte('appointment_date', dateValue())
        .in('status', ['pending', 'confirmed'])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true }),
    ])

    setAvailability((availabilityRows ?? []) as AvailabilityWindow[])
    setAppointments((appointmentRows ?? []) as Appointment[])
  }

  useEffect(() => {
    async function load() {
      if (!slug) return

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const next = `/site/${encodeURIComponent(slug)}/admin`
        window.location.href = `/login?next=${encodeURIComponent(next)}`
        return
      }

      const { data: siteRow, error: siteError } = await supabase
        .from('business_sites')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (siteError || !siteRow) {
        setMessage('This business admin page could not be loaded.')
        setLoading(false)
        return
      }

      const [{ data: membership }, { data: profile }, { data: businessRow }] = await Promise.all([
        supabase
          .from('business_memberships')
          .select('id,membership_role,status')
          .eq('business_id', siteRow.business_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .in('membership_role', ['owner', 'manager'])
          .maybeSingle(),
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase
          .from('businesses')
          .select('id,name,category')
          .eq('id', siteRow.business_id)
          .maybeSingle(),
      ])

      if (!membership && profile?.role !== 'owner') {
        setMessage('You do not have permission to manage this business site.')
        setLoading(false)
        return
      }

      const enabledModules = normalizeEnabledModules(siteRow.enabled_modules)
      const normalizedSite = {
        ...(siteRow as BusinessSite),
        enabled_modules: enabledModules,
        location_config: normalizeLocationConfig(siteRow.location_config),
        logo_url: siteRow.logo_url ?? null,
        phone: siteRow.phone ?? null,
        address: siteRow.address ?? null,
        contact_email: siteRow.contact_email ?? null,
        hours_copy: siteRow.hours_copy ?? null,
        facebook_url: siteRow.facebook_url ?? null,
        instagram_url: siteRow.instagram_url ?? null,
        tiktok_url: siteRow.tiktok_url ?? null,
      }

      setSite(normalizedSite)
      setBusiness((businessRow ?? { id: siteRow.business_id, name: siteRow.site_title, category: null }) as Business)
      setShowLocations(enabledModules.includes('locations'))
      setAuthorized(true)
      await refreshSchedule(siteRow.business_id)
      setLoading(false)
    }

    void load()
  }, [slug, supabase])

  async function saveDetails() {
    if (!site) return
    setWorking('details')
    setMessage('')

    const { error } = await supabase
      .from('business_sites')
      .update({
        site_title: site.site_title.trim(),
        hero_heading: site.hero_heading.trim(),
        hero_copy: site.hero_copy.trim(),
        about_heading: site.about_heading.trim(),
        about_copy: site.about_copy.trim(),
        phone: site.phone?.trim() || null,
        address: site.address?.trim() || null,
        contact_email: site.contact_email?.trim() || null,
        hours_copy: site.hours_copy?.trim() || null,
        facebook_url: site.facebook_url?.trim() || null,
        instagram_url: site.instagram_url?.trim() || null,
        tiktok_url: site.tiktok_url?.trim() || null,
        is_published: site.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', site.id)

    setMessage(error ? error.message : 'Business details saved.')
    setWorking('')
  }

  async function saveLocations() {
    if (!site) return
    setWorking('locations')
    setMessage('')

    const enabledModules = showLocations
      ? Array.from(new Set([...site.enabled_modules, 'locations' as BusinessAppModuleKey]))
      : site.enabled_modules.filter((item) => item !== 'locations')

    const { error } = await supabase
      .from('business_sites')
      .update({
        enabled_modules: enabledModules,
        location_config: site.location_config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', site.id)

    if (!error) {
      setSite({ ...site, enabled_modules: enabledModules })
    }

    setMessage(error ? error.message : 'Location information saved.')
    setWorking('')
  }

  async function addAvailability(event: FormEvent) {
    event.preventDefault()
    if (!site) return

    if (startTime >= endTime) {
      setMessage('End time must be later than start time.')
      return
    }

    setWorking('availability')
    setMessage('')

    const { error } = await supabase.from('business_booking_availability').insert({
      business_id: site.business_id,
      weekday,
      start_time: startTime,
      end_time: endTime,
      is_active: true,
    })

    if (error) {
      setMessage(/duplicate|unique/i.test(error.message) ? 'That schedule window already exists.' : error.message)
    } else {
      setMessage('Schedule window added.')
      await refreshSchedule(site.business_id)
    }
    setWorking('')
  }

  async function removeAvailability(id: string) {
    if (!site) return
    setWorking(id)
    const { error } = await supabase
      .from('business_booking_availability')
      .delete()
      .eq('id', id)

    setMessage(error ? error.message : 'Schedule window removed.')
    if (!error) await refreshSchedule(site.business_id)
    setWorking('')
  }

  async function updateAppointment(appointment: Appointment, status: 'confirmed' | 'cancelled' | 'completed') {
    if (!site) return
    setWorking(appointment.id)
    setMessage('')

    try {
      const response = await fetch(
        `/api/business/scheduler/appointments/${encodeURIComponent(appointment.id)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage(payload?.error || 'Appointment could not be updated.')
      } else {
        setMessage(
          status === 'confirmed'
            ? 'Appointment accepted. The customer will receive the confirmation email when delivery is available.'
            : status === 'cancelled'
              ? 'Appointment cancelled. The customer will receive the cancellation email when delivery is available.'
              : 'Appointment completed.'
        )
        await refreshSchedule(site.business_id)
      }
    } catch {
      setMessage('Appointment could not be updated. Please try again.')
    } finally {
      setWorking('')
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-6 text-slate-900"><div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-sm">Loading business admin…</div></main>
  }

  if (!site || !business || !authorized) {
    return <main className="min-h-screen bg-slate-50 p-6 text-slate-900"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-sm"><h1 className="text-2xl font-black">Business Admin</h1><p className="mt-3 text-slate-600">{message || 'This admin page is unavailable.'}</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-black text-white">Go to RaiseHub</Link></div></main>
  }

  const tabs: Array<{ id: AdminSection; label: string; description: string }> = [
    { id: 'overview', label: 'Overview', description: 'Site status and quick actions' },
    { id: 'details', label: 'Business Details', description: 'Contact, copy, hours, and visibility' },
    { id: 'locations', label: 'Locations', description: 'Fixed or roaming location data' },
    { id: 'schedule', label: 'Schedule', description: 'Availability and appointments' },
    { id: 'integrations', label: 'Integrations', description: 'Calendar and connected tools' },
  ]

  const pendingCount = appointments.filter((appointment) => appointment.status === 'pending').length

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-6 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-lg sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">Business Admin</p>
              <h1 className="mt-2 text-3xl font-black">{business.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Manage the customer-facing site/app, locations, schedule, and appointments from one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/site/${site.slug}`} target="_blank" className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950">View Site ↗</Link>
              <Link href="/dashboard/offers" className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-black text-white">RaiseHub Offers</Link>
            </div>
          </div>
        </header>

        {message ? <div className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{message}</div> : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {tabs.map((tab) => {
            const active = activeSection === tab.id
            return <button key={tab.id} type="button" onClick={() => { setActiveSection(tab.id); setMessage('') }} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white'}`}><strong className="block">{tab.label}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{tab.description}</span></button>
          })}
        </div>

        <section className="mt-5">
          {activeSection === 'overview' ? <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Site</p><p className="mt-2 text-2xl font-black">{site.is_published ? 'Published' : 'Draft'}</p><p className="mt-1 text-sm text-slate-500">/{site.slug}</p></div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Appointments</p><p className="mt-2 text-2xl font-black">{pendingCount}</p><p className="mt-1 text-sm text-slate-500">pending requests</p></div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Business type</p><p className="mt-2 text-lg font-black">{business.category || 'Not set'}</p><Link href="/dashboard/offers#business-profile" className="mt-2 inline-flex text-sm font-black text-blue-700">Edit RaiseHub profile</Link></div>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Install admin app</p>
              <h2 className="mt-1 text-xl font-black">Keep this control panel on your Home Screen</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">The installed admin opens directly to this business and uses the same RaiseHub account/login.</p>
              <InstallBusinessAdminApp slug={site.slug} siteTitle={site.site_title} themeColor={site.accent_color} logoUrl={site.logo_url} />
            </div>

            <div className="rounded-3xl border border-green-200 bg-green-50 p-5">
              <p className="font-black text-green-950">Offers stay in RaiseHub</p>
              <p className="mt-2 text-sm leading-6 text-green-800">This admin handles the business site/app and operations. Exclusive offers, rewards, and fundraising controls stay in the main RaiseHub dashboard.</p>
              <Link href="/dashboard/offers" className="mt-3 inline-flex rounded-xl bg-green-700 px-4 py-2.5 text-sm font-black text-white">Manage RaiseHub Offers</Link>
            </div>
          </div> : null}

          {activeSection === 'details' ? <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Business Details</p><h2 className="mt-1 text-xl font-black">What customers see</h2></div>
              <label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={site.is_published} onChange={(e) => setSite({ ...site, is_published: e.target.checked })} /> Published</label>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">Site title<input value={site.site_title} onChange={(e) => setSite({ ...site, site_title: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="text-sm font-bold">Phone<input value={site.phone ?? ''} onChange={(e) => setSite({ ...site, phone: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="text-sm font-bold sm:col-span-2">Address<input value={site.address ?? ''} onChange={(e) => setSite({ ...site, address: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="text-sm font-bold">Contact email<input type="email" value={site.contact_email ?? ''} onChange={(e) => setSite({ ...site, contact_email: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="text-sm font-bold">Hours<textarea rows={4} value={site.hours_copy ?? ''} onChange={(e) => setSite({ ...site, hours_copy: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="text-sm font-bold sm:col-span-2">Hero heading<input value={site.hero_heading} onChange={(e) => setSite({ ...site, hero_heading: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="text-sm font-bold sm:col-span-2">Hero text<textarea rows={3} value={site.hero_copy} onChange={(e) => setSite({ ...site, hero_copy: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="text-sm font-bold">About heading<input value={site.about_heading} onChange={(e) => setSite({ ...site, about_heading: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="text-sm font-bold sm:col-span-2">About text<textarea rows={5} value={site.about_copy} onChange={(e) => setSite({ ...site, about_copy: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="text-sm font-bold">Facebook<input value={site.facebook_url ?? ''} onChange={(e) => setSite({ ...site, facebook_url: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" placeholder="https://..." /></label>
              <label className="text-sm font-bold">Instagram<input value={site.instagram_url ?? ''} onChange={(e) => setSite({ ...site, instagram_url: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" placeholder="https://..." /></label>
              <label className="text-sm font-bold">TikTok<input value={site.tiktok_url ?? ''} onChange={(e) => setSite({ ...site, tiktok_url: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" placeholder="https://..." /></label>
            </div>
            <button type="button" disabled={working === 'details'} onClick={saveDetails} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-50">{working === 'details' ? 'Saving…' : 'Save business details'}</button>
          </div> : null}

          {activeSection === 'locations' ? <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Location Data</p><h2 className="mt-1 text-xl font-black">Where customers can find you</h2><p className="mt-1 text-sm text-slate-500">Works for one fixed location or a rotating food-truck/mobile schedule.</p></div><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={showLocations} onChange={(e) => setShowLocations(e.target.checked)} /> Show on site</label></div>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-bold">Section heading<input value={site.location_config.heading} onChange={(e) => setSite({ ...site, location_config: { ...site.location_config, heading: e.target.value } })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="text-sm font-bold">Short intro<textarea rows={2} value={site.location_config.intro} onChange={(e) => setSite({ ...site, location_config: { ...site.location_config, intro: e.target.value } })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
            </div>
            <div className="mt-5 space-y-3">
              {site.location_config.stops.map((stop, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Stop name<input value={stop.name} onChange={(e) => { const stops=[...site.location_config.stops]; stops[index]={...stop,name:e.target.value}; setSite({...site,location_config:{...site.location_config,stops}}) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" /></label><label className="text-sm font-bold">When<input value={stop.schedule} onChange={(e) => { const stops=[...site.location_config.stops]; stops[index]={...stop,schedule:e.target.value}; setSite({...site,location_config:{...site.location_config,stops}}) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" placeholder="Fri 11 AM–2 PM" /></label><label className="text-sm font-bold sm:col-span-2">Address / place<input value={stop.address} onChange={(e) => { const stops=[...site.location_config.stops]; stops[index]={...stop,address:e.target.value}; setSite({...site,location_config:{...site.location_config,stops}}) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" /></label><label className="text-sm font-bold sm:col-span-2">Note<input value={stop.note} onChange={(e) => { const stops=[...site.location_config.stops]; stops[index]={...stop,note:e.target.value}; setSite({...site,location_config:{...site.location_config,stops}}) }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" /></label></div><button type="button" onClick={() => setSite({ ...site, location_config: { ...site.location_config, stops: site.location_config.stops.filter((_, itemIndex) => itemIndex !== index) } })} className="mt-3 text-sm font-black text-red-600">Remove stop</button></div>)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setSite({ ...site, location_config: { ...site.location_config, stops: [...site.location_config.stops, { name: '', address: '', schedule: '', note: '' }] } })} className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-black text-blue-700">+ Add location</button><button type="button" disabled={working === 'locations'} onClick={saveLocations} className="rounded-xl bg-green-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{working === 'locations' ? 'Saving…' : 'Save locations'}</button></div>
          </div> : null}

          {activeSection === 'schedule' ? <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Weekly Schedule</p><h2 className="mt-1 text-xl font-black">When customers can book</h2></div><Link href="/dashboard/business/scheduler" className="text-sm font-black text-blue-700">Manage services →</Link></div>
              {availability.length ? <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">{availability.map((window) => <div key={window.id} className="flex items-center gap-3 p-4"><div className="flex-1"><p className="font-black">{WEEKDAYS[window.weekday]}</p><p className="mt-1 text-sm text-slate-600">{displayTime(window.start_time)} – {displayTime(window.end_time)}</p></div><button type="button" disabled={working===window.id} onClick={() => removeAvailability(window.id)} className="text-sm font-black text-red-600">Remove</button></div>)}</div> : <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-900">No online booking hours yet.</p>}
              <form onSubmit={addAvailability} className="mt-5 grid gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 sm:grid-cols-4"><label className="text-sm font-bold">Day<select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-green-200 bg-white p-3">{WEEKDAYS.map((day,index)=><option key={day} value={index}>{day}</option>)}</select></label><label className="text-sm font-bold">Start<input type="time" value={startTime} onChange={(e)=>setStartTime(e.target.value)} className="mt-1 w-full rounded-xl border border-green-200 bg-white p-3" required /></label><label className="text-sm font-bold">End<input type="time" value={endTime} onChange={(e)=>setEndTime(e.target.value)} className="mt-1 w-full rounded-xl border border-green-200 bg-white p-3" required /></label><button type="submit" disabled={working==='availability'} className="self-end rounded-xl bg-green-600 px-4 py-3 font-black text-white disabled:opacity-50">Add window</button></form>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Appointments</p><h2 className="mt-1 text-xl font-black">Upcoming requests</h2></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{pendingCount} pending</span></div>
              {appointments.length ? <div className="mt-5 space-y-3">{appointments.map((appointment)=><article key={appointment.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{appointment.service_name_snapshot}</p><p className="mt-1 text-sm font-bold text-blue-700">{displayDate(appointment.appointment_date)} · {displayTime(appointment.start_time)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${appointment.status==='confirmed'?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800'}`}>{appointment.status==='confirmed'?'accepted':appointment.status}</span></div><div className="mt-3 text-sm leading-6 text-slate-600"><p><strong className="text-slate-900">{appointment.customer_name}</strong></p><p>{appointment.customer_email}</p>{appointment.customer_phone?<p>{appointment.customer_phone}</p>:null}{appointment.customer_note?<p className="mt-2 rounded-xl bg-slate-50 p-3">{appointment.customer_note}</p>:null}</div><div className="mt-4 flex flex-wrap gap-2">{appointment.status==='pending'?<button type="button" disabled={working===appointment.id} onClick={()=>updateAppointment(appointment,'confirmed')} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white">Accept</button>:null}{appointment.status==='confirmed'?<button type="button" disabled={working===appointment.id} onClick={()=>updateAppointment(appointment,'completed')} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Complete</button>:null}<button type="button" disabled={working===appointment.id} onClick={()=>updateAppointment(appointment,'cancelled')} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700">Cancel</button></div></article>)}</div> : <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No upcoming appointment requests.</p>}
            </div>
          </div> : null}

          {activeSection === 'integrations' ? <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Calendar</p><h2 className="mt-1 text-xl font-black">Google Calendar</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Connect the business’s existing Google Calendar so accepted RaiseHub appointments can appear there and, later, busy times can block RaiseHub availability.</p><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-black text-amber-950">Not connected yet</p><p className="mt-1 text-sm leading-6 text-amber-800">The admin surface is ready for this integration. The secure Google Calendar OAuth/token-sync step is the next integration slice; it will not replace the business’s RaiseHub login.</p></div><button type="button" disabled className="mt-4 rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-black text-slate-600">Connect Google Calendar</button></div>
            <div className="rounded-3xl border border-green-200 bg-green-50 p-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">RaiseHub</p><h2 className="mt-1 text-xl font-black">Offers & rewards</h2><p className="mt-2 text-sm leading-6 text-green-800">Keep managing exclusive offers, fundraising participation, and customer rewards from the main RaiseHub business dashboard.</p><Link href="/dashboard/offers" className="mt-4 inline-flex rounded-xl bg-green-700 px-4 py-2.5 text-sm font-black text-white">Go to RaiseHub Offers</Link></div>
          </div> : null}
        </section>
      </section>
    </main>
  )
}
