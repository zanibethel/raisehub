import Link from 'next/link'
import type { ReactNode } from 'react'

import type {
  CustomerDashboardOffer,
  OrganizationLookup,
  PurchasedPass,
} from '@/types/customer-dashboard'

type Props = {
  customerEmail?: string | null
  hasActivePass: boolean
  availableOfferCount: number
  savedOfferCount: number
  totalRedemptionCount: number
  supportedOrganizationName?: string | null
  supportedCampaignName?: string | null
  expiresAt?: string | null
  enrichedOffers: CustomerDashboardOffer[]
  purchasedPasses: PurchasedPass[]
  organizationById: Map<string, OrganizationLookup>
}

function formatDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function DealIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M20 12 12 20 4 12V4h8Z" /><circle cx="9" cy="9" r="1" /></svg>
}

function HeartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></svg>
}

function ActivityIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
}

function FundraiserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M12 3v18" /><path d="M17 7.5c0-1.4-2.2-2.5-5-2.5s-5 1.1-5 2.5 2.2 2.5 5 2.5 5 1.1 5 2.5S14.8 15 12 15s-5-1.1-5-2.5" /></svg>
}

function QuickAction({
  href,
  title,
  tone,
  icon,
}: {
  href: string
  title: string
  tone: 'green' | 'blue' | 'violet' | 'amber'
  icon: ReactNode
}) {
  const toneClasses = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
  }[tone]

  return (
    <Link
      href={href}
      className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses}`}>
        {icon}
      </span>
      <span className="mt-2 text-xs font-black leading-4 text-slate-800 sm:text-sm">{title}</span>
    </Link>
  )
}

export default function CustomerCommandCenter({
  customerEmail,
  hasActivePass,
  availableOfferCount,
  savedOfferCount,
  totalRedemptionCount,
  supportedOrganizationName,
  supportedCampaignName,
  expiresAt,
  enrichedOffers,
  purchasedPasses,
  organizationById,
}: Props) {
  const featuredDeals = enrichedOffers.slice(0, 6)
  const recentSupport = purchasedPasses.slice(0, 4)
  const formattedExpiration = formatDate(expiresAt)
  const customerLabel = customerEmail?.split('@')[0] || 'RaiseHub supporter'

  return (
    <div className="-mx-3 -mt-4 pb-2 sm:mx-0 sm:mt-0">
      <section className={`relative overflow-hidden px-5 py-8 text-white sm:rounded-3xl sm:px-8 sm:py-10 ${{
        hasActivePass
          ? 'bg-gradient-to-br from-green-700 via-green-600 to-blue-700'
          : 'bg-gradient-to-br from-amber-600 via-orange-500 to-blue-700'
      }`}>
        <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <span className="absolute -bottom-16 right-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-slate-900/25 to-transparent" />

        <div className="relative z-10">
          <p className="text-sm font-bold text-white/80">Welcome back, {customerLabel}</p>
          <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">
            {hasActivePass ? 'Your RaiseHub Pass is active' : 'Support local. Unlock local.'}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">
            {hasActivePass
              ? `${{availableOfferCount} local ${{availableOfferCount === 1 ? 'deal is' : 'deals are'} ready to explore.`
              : 'Support a participating fundraiser to unlock local business offers and track your impact.'}
          </p>

          {supportedOrganizationName || supportedCampaignName || formattedExpiration ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {supportedOrganizationName ? (
                <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">
                  Supporting {supportedOrganizationName}
                </span>
              ) : null}
              {supportedCampaignName ? (
                <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">
                  {supportedCampaignName}
                </span>
              ) : null}
              {formattedExpiration ? (
                <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">
                  Expires {formattedExpiration}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-white px-3 py-4 shadow-sm sm:mt-4 sm:rounded-2xl sm:border sm:px-5">
        <div className="min-w-0 px-2 text-center">
          <p className="truncate text-2xl font-black text-slate-950">{savedOfferCount.toLocaleString()}</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Saved Deals</p>
        </div>
        <div className="min-w-0 px-2 text-center">
          <p className="truncate text-2xl font-black text-slate-950">{totalRedemptionCount.toLocaleString()}</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Redemptions</p>
        </div>
        <div className="min-w-0 px-2 text-center">
          <p className="truncate text-2xl font-black text-slate-950">{purchasedPasses.length.toLocaleString()}</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Fundraisers</p>
        </div>
      </section>

      <div className="space-y-7 px-3 pt-6 sm:px-0">
        <section>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Explore & support</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Quick Actions</h2>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            <QuickAction href="/dashboard/deals#available-offers" title="Browse Deals" tone="green" icon={<DealIcon />} />
            <QuickAction href="/dashboard/deals" title="Saved Deals" tone="blue" icon={<HeartIcon />} />
            <QuickAction href="/dashboard/activity" title="My Activity" tone="violet" icon={<ActivityIcon />} />
            <QuickAction href="/campaigns" title="Support Fundraiser" tone="amber" icon={<FundraiserIcon />} />
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Local benefits</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Featured Deals</h2>
            </div>
            <Link href="/dashboard/deals" className="text-sm font-black text-blue-700">View all →</Link>
          </div>

          {featuredDeals.length > 0 ? (
            <div className="-mr-3 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {featuredDeals.map((offer, index) => (
                <Link
                  key={offer.id}
                  href={hasActivePass ? `/offers/${{offer.id}` : '/campaigns'}
                  className="min-w-[76%] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:min-w-[280px]"
                >
                  <div className={`relative h-24 overflow-hidden ${{
                    index % 3 === 0
                      ? 'bg-gradient-to-br from-green-100 via-white to-blue-100'
                      : index % 3 === 1
                        ? 'bg-gradient-to-br from-blue-100 via-slate-50 to-violet-100'
                        : 'bg-gradient-to-br from-amber-100 via-white to-green-100'
                  }`}>
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 shadow-sm">
                      {offer.business_name || 'Local Partner'}
                    </span>
                    <div className="absolute bottom-3 right-4 text-4xl font-black text-slate-900/10">
                      {(offer.business_name || 'R').trim().charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-950">
                      {hasActivePass ? offer.title || 'Local deal' : 'Exclusive local deal'}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs font-bold text-green-700">
                      {hasActivePass
                        ? offer.discount || 'Member benefit available'
                        : typeof offer.customer_value === 'number'
                          ? `$${{offer.customer_value} value`
                          : 'Member value available'}
                    </p>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                      {hasActivePass
                        ? offer.description || 'View the full deal details.'
                        : 'Activate a RaiseHub Pass to reveal the offer details.'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
              <p className="font-black text-slate-950">New local deals are coming</p>
              <p className="mt-1 text-sm text-slate-500">Check back as more community partners publish offers.</p>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Your impact</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Fundraisers You’ve Supported</h2>
            </div>
            <Link href="/campaigns" className="text-sm font-black text-blue-700">Support more →</Link>
          </div>

          {recentSupport.length > 0 ? (
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
              {recentSupport.map((purchase) => {
                const organization = purchase.selected_organization_id
                  ? organizationById.get(purchase.selected_organization_id)
                  : undefined
                const organizationName =
                  organization?.display_name ||
                  organization?.business_name ||
                  'Participating organization'

                return (
                  <Link
                    key={purchase.id}
                    href={purchase.campaigns?.id ? `/campaigns/${{purchase.campaigns.id}` : '/dashboard/activity'}
                    className="flex items-center gap-3 py-3.5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                      <FundraiserIcon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950">
                        {purchase.campaigns?.name || 'RaiseHub fundraiser'}
                      </span>
                      <span className="mt-0.5 block truncate text-xs leading-5 text-slate-500">
                        Supporting {organizationName}
                      </span>
                    </span>
                    <span className="shrink-0 text-xl text-slate-400">›</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
              <p className="font-black text-slate-950">Make your first fundraiser count</p>
              <p className="mt-1 text-sm text-slate-500">Choose a local campaign to support and unlock your RaiseHub Pass.</p>
              <Link href="/campaigns" className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
                Find a fundraiser
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
