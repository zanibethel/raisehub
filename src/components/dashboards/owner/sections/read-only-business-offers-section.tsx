import type {
  OwnerBusinessOffersResult,
  ReadOnlyBusinessOffer,
} from '@/lib/services/owner-business-offer-service'

type ReadOnlyBusinessOffersSectionProps = {
  offersResult: OwnerBusinessOffersResult | null
}

function formatDate(
  value: string | null,
  {
    includeTime = false,
  }: {
    includeTime?: boolean
  } = {}
): string {
  if (!value) {
    return '—'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return '—'
  }

  return includeTime
    ? parsedDate.toLocaleString()
    : parsedDate.toLocaleDateString()
}

function OfferMetadataRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  )
}

function OfferCard({
  offer,
}: {
  offer: ReadOnlyBusinessOffer
}) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <h4 className="min-w-0 break-words text-base font-bold text-slate-950">
          {offer.title}
        </h4>

        <span
          className={
            offer.isActive
              ? 'shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700'
              : 'shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600'
          }
        >
          {offer.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {offer.discount ? (
        <p className="mt-2 break-words text-sm font-semibold text-blue-700">
          {offer.discount}
        </p>
      ) : null}

      {offer.description ? (
        <p className="mt-3 break-words text-sm leading-6 text-slate-700">
          {offer.description}
        </p>
      ) : null}

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Usage rule
        </p>

        <p className="mt-1 break-words text-sm leading-6 text-slate-900">
          {offer.usageRule}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <OfferMetadataRow
          label="Starts"
          value={formatDate(offer.startsAt, {
            includeTime: true,
          })}
        />

        <OfferMetadataRow
          label="Ends"
          value={formatDate(offer.endsAt, {
            includeTime: true,
          })}
        />

        <OfferMetadataRow
          label="Expires"
          value={formatDate(offer.expiresAt)}
        />
      </div>
    </article>
  )
}

export default function ReadOnlyBusinessOffersSection({
  offersResult,
}: ReadOnlyBusinessOffersSectionProps) {
  const renderBody = () => {
    if (!offersResult) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            Offers could not be loaded for this workspace.
          </p>
        </div>
      )
    }

    if (!offersResult.success) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            {offersResult.message}
          </p>
        </div>
      )
    }

    if (offersResult.offers.length === 0) {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            This business has no offers yet.
          </p>
        </div>
      )
    }

    return (
      <div className="grid gap-3">
        {offersResult.offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    )
  }

  return (
    <section className="border-t border-slate-200 p-4 sm:p-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Business offers
          </p>

          <h3 className="mt-1 break-words text-lg font-bold text-slate-950">
            Available offers
          </h3>
        </div>

        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
          Read-only
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        This support view displays real offer records without edit controls.
      </p>

      <div className="mt-4">{renderBody()}</div>
    </section>
  )
}
