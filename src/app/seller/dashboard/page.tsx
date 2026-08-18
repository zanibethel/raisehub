import Link from 'next/link'
import { redirect } from 'next/navigation'

import AccountMenu from '@/app/components/account-menu'
import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { SelectableWorkspace } from '@/lib/types/identity-access'

import SellerProfileForm from './seller-profile-form'
import ShareSellerLink from './share-seller-link'

export const dynamic = 'force-dynamic'

const SELLER_WORKSPACE_KEY = 'seller:current'
const CREDITED_PAYMENT_STATUSES = new Set(['paid', 'test_paid', 'partially_refunded', 'disputed'])

type SellerProfile = { id: string; display_name: string; bio: string | null; avatar_url: string | null; status: string }
type CampaignSeller = { id: string; campaign_id: string; organization_id: string; display_name: string; referral_code: string; status: string }
type Campaign = { id: string; name: string; description: string | null; goal_amount: number | null; starts_at: string | null; ends_at: string | null; status: string }
type Organization = { id: string; name: string }
type Purchase = { id: string; campaign_id: string; amount_paid: number | null; organization_earnings: number | null; payment_status: string; created_at: string }

type SellerDashboardPageProps = {
  searchParams: Promise<{ campaign?: string }>
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function dateLabel(value: string | null) {
  if (!value) return 'No end date set'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function campaignIsShareable(campaign: Campaign | null, entry: CampaignSeller | null) {
  if (!campaign || !entry || entry.status !== 'active' || campaign.status !== 'active') return false
  if (!campaign.ends_at) return true
  return new Date(campaign.ends_at).getTime() >= Date.now()
}

function campaignStatusLabel(campaign: Campaign | null, entry: CampaignSeller | null) {
  if (!campaign || !entry) return 'Unavailable'
  if (entry.status !== 'active') return 'Seller connection inactive'
  if (campaign.status === 'active' && campaignIsShareable(campaign, entry)) return 'Active now'
  if (campaign.status === 'paused') return 'Campaign paused'
  if (campaign.status === 'completed') return 'Campaign completed'
  if (campaign.status === 'archived') return 'Campaign archived'
  if (campaign.ends_at && new Date(campaign.ends_at).getTime() < Date.now()) return 'Campaign ended'
  return campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)
}

export default async function SellerDashboardPage({ searchParams }: SellerDashboardPageProps) {
  const { campaign: requestedCampaignId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fseller%2Fdashboard')

  const admin = createAdminClient() as any
  const fallbackName = String(
    user.user_metadata?.seller_display_name ?? user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Seller'
  ).trim() || 'Seller'

  const existingProfileResult = await admin
    .from('seller_profiles')
    .select('id, display_name, bio, avatar_url, status')
    .eq('user_id', user.id)
    .maybeSingle()

  let sellerProfile = existingProfileResult.data as SellerProfile | null

  if (!sellerProfile) {
    const insertResult = await admin
      .from('seller_profiles')
      .insert({ user_id: user.id, display_name: fallbackName, status: 'active' })
      .select('id, display_name, bio, avatar_url, status')
      .single()
    sellerProfile = insertResult.data as SellerProfile | null
  }

  if (!sellerProfile) {
    return (
      <main className="min-h-screen bg-[#F0F6FF] px-5 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-gray-950">Seller profile unavailable</h1>
          <p className="mt-3 text-gray-600">RaiseHub could not prepare your seller profile. Please try again.</p>
        </div>
      </main>
    )
  }

  const [{ data: rosterEntries }, workspacesResult] = await Promise.all([
    admin.from('campaign_sellers')
      .select('id, campaign_id, organization_id, display_name, referral_code, status')
      .eq('seller_profile_id', sellerProfile.id)
      .order('created_at', { ascending: false }),
    getAuthenticatedWorkspaces(),
  ])

  const entries = (rosterEntries ?? []) as CampaignSeller[]
  const campaignIds = [...new Set(entries.map((entry) => entry.campaign_id))]
  const organizationIds = [...new Set(entries.map((entry) => entry.organization_id))]

  const [{ data: campaigns }, { data: organizations }, { data: purchases }] = await Promise.all([
    campaignIds.length
      ? admin.from('campaigns').select('id, name, description, goal_amount, starts_at, ends_at, status').in('id', campaignIds)
      : Promise.resolve({ data: [] }),
    organizationIds.length
      ? admin.from('organizations').select('id, name').in('id', organizationIds)
      : Promise.resolve({ data: [] }),
    admin.from('campaign_purchases')
      .select('id, campaign_id, amount_paid, organization_earnings, payment_status, created_at')
      .eq('seller_profile_id', sellerProfile.id)
      .order('created_at', { ascending: false }),
  ])

  const campaignRows = (campaigns ?? []) as Campaign[]
  const organizationRows = (organizations ?? []) as Organization[]
  const purchaseRows = (purchases ?? []) as Purchase[]
  const campaignsById = new Map(campaignRows.map((campaign) => [campaign.id, campaign]))
  const organizationsById = new Map(organizationRows.map((organization) => [organization.id, organization]))

  const requestedEntry = requestedCampaignId
    ? entries.find((entry) => entry.campaign_id === requestedCampaignId) ?? null
    : null
  const defaultShareableEntry = entries.find((entry) => campaignIsShareable(campaignsById.get(entry.campaign_id) ?? null, entry)) ?? null
  const selectedEntry = requestedEntry ?? defaultShareableEntry ?? entries[0] ?? null
  const selectedCampaignId = selectedEntry?.campaign_id ?? null
  const selectedCampaign = selectedEntry ? campaignsById.get(selectedEntry.campaign_id) ?? null : null
  const selectedOrganization = selectedEntry ? organizationsById.get(selectedEntry.organization_id) ?? null : null
  const selectedPurchases = selectedCampaignId
    ? purchaseRows.filter((purchase) => purchase.campaign_id === selectedCampaignId)
    : []
  const creditedPurchases = selectedPurchases.filter((purchase) => CREDITED_PAYMENT_STATUSES.has(purchase.payment_status))
  const grossSales = creditedPurchases.reduce((sum, purchase) => sum + Number(purchase.amount_paid ?? 0), 0)
  const organizationFunds = creditedPurchases.reduce((sum, purchase) => sum + Number(purchase.organization_earnings ?? 0), 0)
  const canShareSelectedCampaign = campaignIsShareable(selectedCampaign, selectedEntry)
  const shareUrl = canShareSelectedCampaign && selectedEntry
    ? `https://raisehub.app/campaigns/${selectedEntry.campaign_id}?seller=${encodeURIComponent(selectedEntry.referral_code)}`
    : null
  const sellerWorkspace: SelectableWorkspace = {
    key: SELLER_WORKSPACE_KEY,
    kind: 'fundraising',
    name: 'Seller Dashboard',
    subtitle: selectedCampaign?.name ?? 'Share campaigns and follow your results',
    href: '/seller/dashboard',
    workspaceId: sellerProfile.id,
    membershipId: null,
    legacyProfileId: user.id,
    source: 'campaign-membership',
    isDefault: false,
  }
  const workspaces = [
    sellerWorkspace,
    ...(workspacesResult.success ? workspacesResult.workspaces : []),
  ]

  return (
    <main className="min-h-screen bg-[#F0F6FF] p-3 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <header className="rounded-3xl border border-violet-100 bg-white/95 p-5 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">Seller</span>
              <h1 className="mt-3 text-2xl font-bold text-gray-950 sm:text-3xl">{sellerProfile.display_name}</h1>
              <p className="mt-2 text-sm text-gray-600 sm:text-base">Share your campaign and see the results attributed to your personal link.</p>
            </div>
            <AccountMenu email={user.email ?? null} workspaces={workspaces} selectedWorkspaceKey={SELLER_WORKSPACE_KEY} />
          </div>
        </header>

        {!selectedEntry || !selectedCampaign ? (
          <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-lg sm:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">What should I do next?</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-950">Join and claim a campaign roster name</h2>
            <p className="mt-3 max-w-2xl text-gray-600">Ask your organizer for the seller signup link. After joining, claim the name they added to the campaign roster so your personal link and sales are connected correctly.</p>
            <Link href="/seller/claim-roster" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Claim my roster name</Link>
          </section>
        ) : (
          <>
            {entries.length > 1 ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Campaign view</p>
                    <p className="mt-1 text-sm text-slate-600">Switch between current and historical campaign results.</p>
                  </div>
                  <div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
                    {entries.map((entry) => {
                      const campaign = campaignsById.get(entry.campaign_id)
                      const selected = entry.id === selectedEntry.id
                      return (
                        <Link
                          key={entry.id}
                          href={`/seller/dashboard?campaign=${encodeURIComponent(entry.campaign_id)}`}
                          className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}
                        >
                          {campaign?.name ?? 'Campaign'}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </section>
            ) : null}

            {canShareSelectedCampaign ? (
              <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-lg sm:p-8">
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">What should I do next?</p>
                <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-950">Share your personal fundraiser link</h2>
                    <p className="mt-2 text-gray-600">Purchases through this link are attributed to {selectedEntry.display_name} for {selectedCampaign.name}.</p>
                    <p className="mt-2 text-sm text-gray-500">{selectedOrganization?.name ?? 'Organization'} · Campaign ends {dateLabel(selectedCampaign.ends_at)}</p>
                  </div>
                  <Link href={`/campaigns/${selectedCampaign.id}?seller=${encodeURIComponent(selectedEntry.referral_code)}`} className="min-h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-bold text-blue-700 hover:bg-blue-100">Preview my campaign page</Link>
                </div>
                {shareUrl ? <div className="mt-5 max-w-2xl"><ShareSellerLink url={shareUrl} campaignName={selectedCampaign.name} /></div> : null}
              </section>
            ) : (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Campaign history</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-950">{selectedCampaign.name}</h2>
                    <p className="mt-2 text-gray-600">This campaign is not currently available for new seller sharing. Your attributed results remain here for reference.</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{campaignStatusLabel(selectedCampaign, selectedEntry)} · {selectedOrganization?.name ?? 'Organization'}</p>
                  </div>
                  {defaultShareableEntry && defaultShareableEntry.id !== selectedEntry.id ? (
                    <Link href={`/seller/dashboard?campaign=${encodeURIComponent(defaultShareableEntry.campaign_id)}`} className="min-h-11 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700">Go to active campaign</Link>
                  ) : null}
                </div>
              </section>
            )}

            <section className="grid grid-cols-3 gap-2 sm:gap-4">
              <article className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm sm:p-5"><p className="text-xs font-semibold text-gray-500 sm:text-sm">Passes sold</p><p className="mt-2 text-2xl font-bold text-blue-700 sm:text-3xl">{creditedPurchases.length}</p></article>
              <article className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm sm:p-5"><p className="text-xs font-semibold text-gray-500 sm:text-sm">Attributed sales</p><p className="mt-2 text-lg font-bold text-emerald-700 sm:text-3xl">{money(grossSales)}</p></article>
              <article className="rounded-2xl border border-violet-100 bg-white p-3 shadow-sm sm:p-5"><p className="text-xs font-semibold text-gray-500 sm:text-sm">Org. funds</p><p className="mt-2 text-lg font-bold text-violet-700 sm:text-3xl">{money(organizationFunds)}</p></article>
            </section>

            <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">
              <summary className="cursor-pointer text-lg font-bold text-gray-950 sm:text-xl">Recent attributed purchases</summary>
              {creditedPurchases.length ? (
                <div className="mt-4 divide-y divide-slate-100">
                  {creditedPurchases.slice(0, 8).map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between gap-4 py-4">
                      <div><p className="font-semibold text-gray-900">RaiseHub Pass purchase</p><p className="mt-1 text-sm text-gray-500">{dateLabel(purchase.created_at)}</p></div>
                      <p className="font-bold text-emerald-700">{money(Number(purchase.amount_paid ?? 0))}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-3 text-gray-600">No credited purchases have been attributed to this seller link yet.</p>}
            </details>
          </>
        )}

        <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">
          <summary className="cursor-pointer text-lg font-bold text-gray-950 sm:text-xl">Seller profile</summary>
          <p className="mt-2 text-sm text-gray-600">Keep the name and optional story supporters see associated with your seller account.</p>
          <div className="mt-5 max-w-2xl"><SellerProfileForm displayName={sellerProfile.display_name} bio={sellerProfile.bio ?? ''} avatarUrl={sellerProfile.avatar_url ?? ''} /></div>
        </details>

        {entries.length > 1 ? (
          <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">
            <summary className="cursor-pointer text-lg font-bold text-gray-950 sm:text-xl">All campaign connections</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {entries.map((entry) => {
                const campaign = campaignsById.get(entry.campaign_id)
                const organization = organizationsById.get(entry.organization_id)
                return (
                  <article key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-950">{campaign?.name ?? 'Campaign'}</p>
                        <p className="mt-1 text-sm text-gray-500">{organization?.name ?? 'Organization'}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{campaignStatusLabel(campaign ?? null, entry)}</span>
                    </div>
                    <Link href={`/seller/dashboard?campaign=${encodeURIComponent(entry.campaign_id)}`} className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:underline">View results →</Link>
                  </article>
                )
              })}
            </div>
          </details>
        ) : null}
      </div>
    </main>
  )
}
