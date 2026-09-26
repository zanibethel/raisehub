import Link from 'next/link'

import {
  getPublicUpcomingBusinessEvents,
  type PublicBusinessEvent,
} from '@/lib/repositories/business-event-repository'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatEventDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Upcoming'

  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function EventRow({ event }: { event: PublicBusinessEvent }) {
  return (
    <article
      id={`event-${event.id}`}
      className={`scroll-mt-28 rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${
        event.promoted
          ? 'border-amber-300 ring-1 ring-amber-200'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
            {formatEventDate(event.starts_at)}
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
            {event.title}
          </h2>
          <p className="mt-1 text-sm font-black text-green-700">
            {event.business_name}
          </p>
        </div>
        {event.promoted ? (
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-950">
            Featured event
          </span>
        ) : null}
      </div>

      {event.venue_name || event.address ? (
        <p className="mt-3 text-sm font-semibold text-slate-700">
          {[event.venue_name, event.address].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      {event.description ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {event.description}
        </p>
      ) : null}

      {event.external_url ? (
        <a
          href={event.external_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-blue-700 px-4 text-sm font-black text-white"
        >
          Event details
        </a>
      ) : null}
    </article>
  )
}

export default async function LocalEventsPage() {
  const events = await getPublicUpcomingBusinessEvents(60)

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-xl sm:px-8 sm:py-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
            RaiseHub Local Events
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            See what local businesses have coming up
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Community Partners can publish upcoming events here. Featured events
            are promoted with earned Partner Points.
          </p>
          <Link
            href="/home"
            className="mt-5 inline-flex min-h-10 items-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white"
          >
            Back to RaiseHub
          </Link>
        </section>

        {events.length ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-xl font-black">No upcoming events yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Check back as local RaiseHub businesses publish their next events.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
