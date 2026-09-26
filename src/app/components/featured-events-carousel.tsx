import Link from 'next/link'

import {
  getPublicUpcomingBusinessEvents,
  type PublicBusinessEvent,
} from '@/lib/repositories/business-event-repository'

function formatEventDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Upcoming'

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function EventCard({ event }: { event: PublicBusinessEvent }) {
  return (
    <article
      id={`event-${event.id}`}
      className={`flex w-[min(82vw,340px)] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border bg-white shadow-sm ${
        event.promoted
          ? 'border-amber-300 ring-1 ring-amber-200'
          : 'border-slate-200'
      }`}
    >
      <div
        className={`px-5 py-4 ${
          event.promoted
            ? 'bg-gradient-to-br from-amber-100 via-white to-green-50'
            : 'bg-slate-50'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
            {formatEventDate(event.starts_at)}
          </span>
          {event.promoted ? (
            <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950">
              Featured
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 text-xl font-black leading-tight text-slate-950">
          {event.title}
        </h3>
        <p className="mt-1 text-sm font-bold text-green-700">
          {event.business_name}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {event.venue_name || event.address ? (
          <p className="text-sm font-semibold leading-5 text-slate-700">
            {[event.venue_name, event.address].filter(Boolean).join(' · ')}
          </p>
        ) : null}

        {event.description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {event.description}
          </p>
        ) : null}

        {event.external_url ? (
          <a
            href={event.external_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-black text-white"
          >
            Event details
          </a>
        ) : (
          <Link
            href={`/events#event-${event.id}`}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-black text-blue-700"
          >
            View event
          </Link>
        )}
      </div>
    </article>
  )
}

export default async function FeaturedEventsCarousel() {
  const events = await getPublicUpcomingBusinessEvents(10)
  if (!events.length) return null

  return (
    <section className="mx-auto mt-12 max-w-6xl sm:mt-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            Around the community
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Local Events
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Upcoming events from RaiseHub Community Partners.
          </p>
        </div>
        <Link href="/events" className="shrink-0 text-sm font-black text-blue-700">
          View all →
        </Link>
      </div>

      <div className="-mr-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-4 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}
