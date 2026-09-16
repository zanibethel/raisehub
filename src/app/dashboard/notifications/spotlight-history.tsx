import Link from 'next/link'

export type SpotlightHistoryItem = {
  id: string
  title: string
  body: string | null
  kind: string
  ctaLabel: string | null
  ctaUrl: string | null
  firstViewedAt: string | null
  lastViewedAt: string | null
  clickedAt: string | null
  dismissedAt: string | null
  viewCount: number
  endsAt: string | null
}

function formatDate(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function kindLabel(kind: string) {
  return kind
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function SpotlightHistory({ items }: { items: SpotlightHistoryItem[] }) {
  if (items.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Spotlights</p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">Previously shown to you</h2>
        <p className="mt-1 text-sm text-gray-500">
          Spotlights stay here after you close or dismiss the login carousel so you can revisit them later.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const expired = Boolean(item.endsAt && new Date(item.endsAt) < new Date())
          const viewedAt = item.lastViewedAt ?? item.firstViewedAt

          return (
            <article key={item.id} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                  Spotlight · {kindLabel(item.kind)}
                </span>
                {item.dismissedAt ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">Dismissed from popup</span>
                ) : null}
                {item.clickedAt ? (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] text-green-700">Opened</span>
                ) : null}
                {expired ? (
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] text-orange-700">Expired</span>
                ) : null}
              </div>

              <h3 className="mt-3 font-bold text-gray-900">{item.title}</h3>
              {item.body ? <p className="mt-1 text-sm leading-6 text-gray-600">{item.body}</p> : null}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                {viewedAt ? <span>Last seen {formatDate(viewedAt)}</span> : null}
                <span>{item.viewCount} {item.viewCount === 1 ? 'view' : 'views'}</span>
              </div>

              {item.ctaUrl ? (
                <Link
                  href={item.ctaUrl}
                  className="mt-4 inline-flex rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
                >
                  {item.ctaLabel || 'Open'}
                </Link>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
