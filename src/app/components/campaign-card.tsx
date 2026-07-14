import Link from 'next/link'
import type { SelectableCampaignCard } from '@/lib/types/campaigns'

type CampaignCardProps = {
  campaign: SelectableCampaignCard
  actionLabel: string
  href?: string
  onClick?: () => void
  selected?: boolean
  className?: string
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No end date'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'No end date'
  }

  return date.toLocaleDateString()
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function CampaignCard({
  campaign,
  actionLabel,
  href,
  onClick,
  selected = false,
  className = '',
}: CampaignCardProps) {
  const goalLabel = formatCurrency(campaign.goalAmount)
  const amountRemainingLabel = formatCurrency(campaign.amountRemaining)
  const percentageLabel =
    campaign.goalPercentage === null
      ? 'Open goal'
      : `${Math.round(campaign.goalPercentage)}% of goal`
  const daysRemainingLabel =
    campaign.daysRemaining === null
      ? 'Flexible timeline'
      : campaign.daysRemaining === 1
        ? '1 day left'
        : `${campaign.daysRemaining} days left`

  const cardBody = (
    <>
      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-blue-100 via-slate-50 to-green-100">
          {campaign.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.imageUrl}
              alt={campaign.organizationName ?? campaign.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-blue-700 shadow">
              {getInitials(campaign.organizationName ?? campaign.name)}
            </div>
          )}
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Active campaign
              </p>
              <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-gray-900">
                {campaign.name}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {campaign.organizationName ?? 'RaiseHub organization'}
              </p>
            </div>

            {selected ? (
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                Selected
              </span>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-green-700">
                {percentageLabel}
              </span>
              <span className="text-gray-500">{daysRemainingLabel}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-600 transition-all"
                style={{ width: `${campaign.goalPercentage ?? 0}%` }}
                role="progressbar"
                aria-valuenow={Math.round(campaign.goalPercentage ?? 0)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={percentageLabel}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="font-bold text-blue-700">
                {formatCurrency(campaign.amountRaised)}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                raised of {goalLabel}
              </p>
            </div>

            <div className="rounded-xl bg-green-50 p-3">
              <p className="font-bold text-green-700">{amountRemainingLabel}</p>
              <p className="mt-1 text-xs text-gray-600">remaining</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
            <span>Ends {formatDate(campaign.endsAt)}</span>
            <span>{daysRemainingLabel}</span>
          </div>

          <div
            className={`rounded-xl px-5 py-3 text-center font-semibold transition ${
              selected
                ? 'bg-green-600 text-white'
                : 'border border-green-200 bg-white text-green-700 hover:bg-green-50'
            }`}
          >
            {selected ? `${actionLabel} ✓` : actionLabel}
          </div>
        </div>
      </div>
      <span className="sr-only">
        {campaign.organizationName ?? 'Organization'} campaign ending{' '}
        {formatDate(campaign.endsAt)}.
      </span>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`block min-w-[82%] snap-center rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:min-w-[360px] ${className}`}
      >
        {cardBody}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`block min-w-[82%] snap-center rounded-3xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:min-w-[360px] ${className}`}
    >
      {cardBody}
    </button>
  )
}
