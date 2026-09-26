'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

type Business = {
  id: string
  name: string
}

type BusinessEvent = {
  id: string
  business_id: string
  title: string
  description: string | null
  venue_name: string | null
  address: string | null
  starts_at: string
  ends_at: string | null
  external_url: string | null
  is_published: boolean
  created_at: string
}

type EventDraft = {
  id?: string
  title: string
  description: string
  venue_name: string
  address: string
  starts_at: string
  ends_at: string
  external_url: string
  is_published: boolean
}

const emptyDraft: EventDraft = {
  title: '',
  description: '',
  venue_name: '',
  address: '',
  starts_at: '',
  ends_at: '',
  external_url: '',
  is_published: false,
}

function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIso(value: string) {
  if (!value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function formatEventTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function BusinessEventsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [business, setBusiness] = useState<Business | null>(null)
  const [events, setEvents] = useState<BusinessEvent[]>([])
  const [draft, setDraft] = useState<EventDraft>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login?next=/dashboard/business/events'
        return
      }

      const requestedBusinessId =
        new URLSearchParams(window.location.search).get('business')?.trim() ||
        undefined

      let membershipQuery = supabase
        .from('business_memberships')
        .select('business_id,membership_role,status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .in('membership_role', ['owner', 'manager'])

      if (requestedBusinessId) {
        membershipQuery = membershipQuery.eq(
          'business_id',
          requestedBusinessId
        )
      }

      const { data: memberships } = await membershipQuery.limit(1)
      let businessId = memberships?.[0]?.business_id as string | undefined

      if (!businessId) {
        let legacyBusinessQuery = supabase
          .from('businesses')
          .select('id')
          .eq('legacy_profile_id', user.id)

        if (requestedBusinessId) {
          legacyBusinessQuery = legacyBusinessQuery.eq(
            'id',
            requestedBusinessId
          )
        }

        const { data: legacyBusiness } =
          await legacyBusinessQuery.maybeSingle()
        businessId = legacyBusiness?.id
      }

      if (!businessId) {
        setMessage(
          'Only a business owner or manager can manage events for this workspace.'
        )
        setLoading(false)
        return
      }

      const [{ data: businessData }, { data: eventData, error: eventError }] =
        await Promise.all([
          supabase
            .from('businesses')
            .select('id,name')
            .eq('id', businessId)
            .single(),
          (supabase as any)
            .from('business_events')
            .select(
              'id,business_id,title,description,venue_name,address,starts_at,ends_at,external_url,is_published,created_at'
            )
            .eq('business_id', businessId)
            .order('starts_at', { ascending: true }),
        ])

      if (!businessData) {
        setMessage('We could not load this business workspace.')
        setLoading(false)
        return
      }

      if (eventError) {
        setMessage(
          'Event tools are not available yet. Refresh after the latest RaiseHub database update finishes.'
        )
      }

      setBusiness(businessData as Business)
      setEvents((eventData ?? []) as BusinessEvent[])
      setLoading(false)
    }

    void load()
  }, [supabase])

  function editEvent(event: BusinessEvent) {
    setDraft({
      id: event.id,
      title: event.title,
      description: event.description ?? '',
      venue_name: event.venue_name ?? '',
      address: event.address ?? '',
      starts_at: toLocalInput(event.starts_at),
      ends_at: toLocalInput(event.ends_at),
      external_url: event.external_url ?? '',
      is_published: event.is_published,
    })
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetDraft() {
    setDraft(emptyDraft)
    setMessage('')
  }

  async function saveEvent(publish?: boolean) {
    if (!business || saving) return

    const title = draft.title.trim()
    const startsAt = toIso(draft.starts_at)
    const endsAt = toIso(draft.ends_at)

    if (!title || !startsAt) {
      setMessage('Add an event title and start date/time.')
      return
    }

    if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setMessage('The event end time must be after the start time.')
      return
    }

    setSaving(true)
    setMessage('')

    const payload = {
      business_id: business.id,
      title,
      description: draft.description.trim() || null,
      venue_name: draft.venue_name.trim() || null,
      address: draft.address.trim() || null,
      starts_at: startsAt,
      ends_at: endsAt,
      external_url: draft.external_url.trim() || null,
      is_published: publish ?? draft.is_published,
      updated_at: new Date().toISOString(),
    }

    const query = draft.id
      ? (supabase as any)
          .from('business_events')
          .update(payload)
          .eq('id', draft.id)
          .eq('business_id', business.id)
      : (supabase as any).from('business_events').insert(payload)

    const { data, error } = await query
      .select(
        'id,business_id,title,description,venue_name,address,starts_at,ends_at,external_url,is_published,created_at'
      )
      .single()

    if (error || !data) {
      setMessage(error?.message || 'Could not save this event.')
      setSaving(false)
      return
    }

    const saved = data as BusinessEvent
    setEvents((current) => {
      const next = current.some((item) => item.id === saved.id)
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [...current, saved]

      return next.sort(
        (left, right) =>
          new Date(left.starts_at).getTime() -
          new Date(right.starts_at).getTime()
      )
    })

    setDraft(emptyDraft)
    setMessage(
      saved.is_published
        ? 'Event published. It is now eligible for RaiseHub Event Promotion.'
        : 'Event saved as a draft.'
    )
    setSaving(false)
  }

  async function deleteEvent(eventId: string) {
    if (!business || saving) return
    if (!window.confirm('Delete this event?')) return

    setSaving(true)
    const { error } = await (supabase as any)
      .from('business_events')
      .delete()
      .eq('id', eventId)
      .eq('business_id', business.id)

    if (error) {
      setMessage(error.message)
    } else {
      setEvents((current) => current.filter((event) => event.id !== eventId))
      if (draft.id === eventId) setDraft(emptyDraft)
      setMessage('Event deleted.')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F0F6FF] p-4 sm:p-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">
          Loading event tools…
        </div>
      </main>
    )
  }

  if (!business) {
    return (
      <main className="min-h-screen bg-[#F0F6FF] p-4 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            Events &amp; Promotions
          </h1>
          <p className="mt-3 text-slate-600">{message}</p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    )
  }

  const upcomingEvents = events.filter(
    (event) => new Date(event.starts_at).getTime() > Date.now()
  )
  const pastEvents = events.filter(
    (event) => new Date(event.starts_at).getTime() <= Date.now()
  )

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-3 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-lg sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">
            {business.name}
          </p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            Events &amp; Promotions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Publish events customers should know about. Your next qualifying
            event can be featured in RaiseHub Local Events with Partner Points.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/rewards"
              prefetch={false}
              className="inline-flex min-h-10 items-center rounded-xl bg-amber-400 px-4 text-sm font-black text-slate-950"
            >
              Open Partner Rewards
            </Link>
            <Link
              href="/events"
              className="inline-flex min-h-10 items-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white"
            >
              View Local Events
            </Link>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                {draft.id ? 'Edit event' : 'Create event'}
              </p>
              <h2 className="mt-1 text-xl font-black">
                {draft.id ? 'Update event details' : 'Add your next event'}
              </h2>
            </div>
            {draft.id ? (
              <button
                type="button"
                onClick={resetDraft}
                className="text-sm font-black text-blue-700"
              >
                New event
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold sm:col-span-2">
              Event title
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                placeholder="Friday Night Patio Music"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-bold">
              Starts
              <input
                type="datetime-local"
                value={draft.starts_at}
                onChange={(event) =>
                  setDraft({ ...draft, starts_at: event.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-bold">
              Ends
              <input
                type="datetime-local"
                value={draft.ends_at}
                onChange={(event) =>
                  setDraft({ ...draft, ends_at: event.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-bold">
              Venue / event name
              <input
                value={draft.venue_name}
                onChange={(event) =>
                  setDraft({ ...draft, venue_name: event.target.value })
                }
                placeholder={business.name}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-bold">
              Address
              <input
                value={draft.address}
                onChange={(event) =>
                  setDraft({ ...draft, address: event.target.value })
                }
                placeholder="Event location"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-bold sm:col-span-2">
              Description
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
                rows={4}
                placeholder="Tell customers what is happening and why they should come."
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-bold sm:col-span-2">
              Optional event or ticket link
              <input
                type="url"
                value={draft.external_url}
                onChange={(event) =>
                  setDraft({ ...draft, external_url: event.target.value })
                }
                placeholder="https://"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => saveEvent(false)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveEvent(true)}
              className="min-h-11 rounded-xl bg-green-700 px-4 text-sm font-black text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save & publish'}
            </button>
          </div>

          {message ? (
            <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
              {message}
            </p>
          ) : null}
        </section>

        <section className="mt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">
                Upcoming
              </p>
              <h2 className="mt-1 text-xl font-black">Your events</h2>
            </div>
            <span className="text-sm font-bold text-slate-500">
              {upcomingEvents.length} upcoming
            </span>
          </div>

          {upcomingEvents.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {upcomingEvents.map((event) => (
                <article
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                        {formatEventTime(event.starts_at)}
                      </p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">
                        {event.title}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                        event.is_published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {event.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  {event.venue_name || event.address ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {[event.venue_name, event.address]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                  {event.description ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                      {event.description}
                    </p>
                  ) : null}
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => editEvent(event)}
                      className="text-sm font-black text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEvent(event.id)}
                      className="text-sm font-black text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
              Add and publish an upcoming event to make Event Promotion
              available in Partner Rewards.
            </div>
          )}
        </section>

        {pastEvents.length ? (
          <section className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Past events
            </p>
            <div className="mt-2 space-y-2">
              {pastEvents.slice(-6).reverse().map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => editEvent(event)}
                  className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left shadow-sm"
                >
                  <span>
                    <span className="block text-sm font-black text-slate-900">
                      {event.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {formatEventTime(event.starts_at)}
                    </span>
                  </span>
                  <span className="text-slate-400">›</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
