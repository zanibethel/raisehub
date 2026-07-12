import type {
  OwnerOrganizationCampaignsResult,
  ReadOnlyOrganizationCampaign,
} from '@/lib/services/owner-organization-campaign-service'

type ReadOnlyOrganizationCampaignsSectionProps = {
  campaignsResult: OwnerOrganizationCampaignsResult | null
}

function formatDateOnly(value: string | null): string {
  if (!value) {
    return '—'
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return '—'
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utcDate = new Date(Date.UTC(year, month - 1, day))

  if (
    Number.isNaN(utcDate.getTime()) ||
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate)
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return '—'
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function CampaignMetadataRow({
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

function CampaignCard({
  campaign,
}: {
  campaign: ReadOnlyOrganizationCampaign
}) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <h4 className="min-w-0 break-words text-base font-bold text-slate-950">
          {campaign.name}
        </h4>

        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          {campaign.status}
        </span>
      </div>

      {campaign.description ? (
        <p className="mt-3 break-words text-sm leading-6 text-slate-700">
          {campaign.description}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <CampaignMetadataRow
          label="Goal"
          value={formatCurrency(campaign.goalAmount)}
        />

        <CampaignMetadataRow
          label="Pass price"
          value={formatCurrency(campaign.passPrice)}
        />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <CampaignMetadataRow
          label="Starts"
          value={formatDateOnly(campaign.startsAt)}
        />

        <CampaignMetadataRow
          label="Ends"
          value={formatDateOnly(campaign.endsAt)}
        />
      </div>
    </article>
  )
}

export default function ReadOnlyOrganizationCampaignsSection({
  campaignsResult,
}: ReadOnlyOrganizationCampaignsSectionProps) {
  const renderBody = () => {
    if (!campaignsResult) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            Campaigns could not be loaded for this workspace.
          </p>
        </div>
      )
    }

    if (!campaignsResult.success) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            {campaignsResult.message}
          </p>
        </div>
      )
    }

    if (campaignsResult.campaigns.length === 0) {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            This organization has no campaigns yet.
          </p>
        </div>
      )
    }

    return (
      <div className="grid gap-3">
        {campaignsResult.campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
          />
        ))}
      </div>
    )
  }

  return (
    <section className="border-t border-slate-200 p-4 sm:p-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Organization campaigns
          </p>

          <h3 className="mt-1 break-words text-lg font-bold text-slate-950">
            Fundraising campaigns
          </h3>
        </div>

        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
          Read-only
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        This support view displays real campaign records without edit controls.
      </p>

      <div className="mt-4">{renderBody()}</div>
    </section>
  )
}
