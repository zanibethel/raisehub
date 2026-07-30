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

type SellerProfile = { id: string; display_name: string; bio: string | null; avatar_url: string | null; status: string }
type CampaignSeller = { id: string; campaign_id: string; organization_id: string; display_name: string; referral_code: string; status: string }
type Campaign = { id: string; name: string; description: string | null; goal_amount: number | null; starts_at: string | null; ends_at: string | null; status: string }
type Organization = { id: string; name: string }
type Purchase = { id: string; campaign_id: string; amount_paid: number | null; organization_earnings: number | null; created_at: string }

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function dateLabel(value: string | null) {
  if (!value) return 'No end date set'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export default async function SellerDashboardPage() {
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
      .select('id, campaign_id, amount_paid, organization_earnings, created_at')
      .eq('seller_profile_id', sellerProfile.id)
      .order('created_at', { ascending: false }),
  ])

  const campaignRows = (campaigns ?? []) as Campaign[]
  const organizationRows = (organizations ?? []) as Organization[]
  const purchaseRows = (purchases ?? []) as Purchase[]
  const campaignsById = new Map(campaignRows.map((campaign) => [campaign.id, campaign]))
  const organizationsById = new Map(organizationRows.map((organization) => [organization.id, organization]))
  const activeEntry = entries.find((entry) => entry.status === 'active') ?? entries[0] ?? null
  const activeCampaign = activeEntry ? campaignsById.get(activeEntry.campaign_id) ?? null : null
  const activeOrganization = activeEntry ? organizationsById.get(activeEntry.organization_id) ?? null : null
  const activePurchases = activeEntry ? purchaseRows.filter((purchase) => purchase.campaign_id === activeEntry.campaign_id) : []
  const grossSales = activePurchases.reduce((sum, purchase) => sum + Number(purchase.amount_paid ?? 0), 0)
  const organizationFunds = activePurchases.reduce((sum, purchase) => sum + Number(purchase.organization_earnings ?? 0), 0)
  const shareUrl = activeEntry
    ? `https://raisehub.app/campaigns/${activeEntry.campaign_id}?seller=${encodeURIComponent(activeEntry.referral_code)}`
    : null
  const sellerWorkspace: SelectableWorkspace = {
    key: SELLER_WORKSPACE_KEY,
    kind: 'fundraising',
    name: 'Seller Dashboard',
    subtitle: activeCampaign?.name ?? 'Share campaigns and follow your results',
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
    <main className="min-h-screen bg-[#F0F6FF] p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">Seller</span>
              <h1 className="mt-4 text-3xl font-bold text-gray-950">{sellerProfile.display_name}</h1>
              <p className="mt-2 text-gray-600">Share your campaign, follow your results, and keep your seller profile current.</p>
            </div>
            <AccountMenu email={user.email ?? null} workspaces={workspaces} selectedWorkspaceKey={SELLER_WORKSPACE_KEY} />
          </div>
        </header>

        {!activeEntry || !activeCampaign ? (
          <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-lg sm:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">What should I do next?</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-950">Join and claim a campaign roster name</h2>
            <p className="mt-3 max-w-2xl text-gray-600">Ask your organizer for the seller signup link. After joining, claim the name they added to the campaign roster so your personal link and sales are connected correctly.</p>
            <Link href="/seller/claim-roster" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Claim my roster name</Link>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-lg sm:p-8">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">What should I do next?</p>
              <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-950">Share your personal fundraiser link</h2>
                  <p className="mt-2 text-gray-600">Purchases through this link are attributed to {activeEntry.display_name} for {activeCampaign.name}.</p>
                  <p className="mt-2 text-sm text-gray-500">{activeOrganization?.name ?? 'Organization'} · Campaign ends {dateLabel(activeCampaign.ends_at)}</p>
                </div>
                <Link href={`/campaigns/${activeCampaign.id}?seller=${encodeURIComponent(activeEntry.referral_code)}`} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-bold text-blue-700 hover:bg-blue-100">Preview my campaign page</Link>
              </div>
              {shareUrl ? <div className="mt-6 max-w-2xl"><ShareSellerLink url={shareUrl} campaignName={activeCampaign.name} /></div> : null}
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-gray-500">Passes sold</p><p className="mt-2 text-3xl font-bold text-blue-700">{activePurchases.length}</p></article>
              <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-gray-500">Sales through your link</p><p className="mt-2 text-3xl font-bold text-emerald-700">{money(grossSales)}</p></article>
              <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-gray-500">Organization funds attributed</p><p className="mt-2 text-3xl font-bold text-violet-700">{money(organizationFunds)}</p></article>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
              <h2 className="text-xl font-bold text-gray-950">Recent attributed purchases</h2>
              {activePurchases.length ? (
                <div className="mt-4 divide-y divide-slate-100">
                  {activePurchases.slice(0, 8).map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between gap-4 py-4">
                      <div><p className="font-semibold text-gray-900">RaiseHub Pass purchase</p><p className="mt-1 text-sm text-gray-500">{dateLabel(purchase.created_at)}</p></div>
                      <p className="font-bold text-emerald-700">{money(Number(purchase.amount_paid ?? 0))}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-3 text-gray-600">No purchases have been attributed to this seller link yet.</p>}
            </section>
          </>
        )}

        <details className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <summary className="cursor-pointer text-xl font-bold text-gray-950">Edit seller profile</summary>
          <div className="mt-5 max-w-2xl"><SellerProfileForm displayName={sellerProfile.display_name} bio={sellerProfile.bio ?? ''} avatarUrl={sellerProfile.avatar_url ?? ''} /></div>
        </details>

        {entries.length > 1 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <h2 className="text-xl font-bold text-gray-950">Your campaign connections</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {entries.map((entry) => {
                const campaign = campaignsById.get(entry.campaign_id)
                const organization = organizationsById.get(entry.organization_id)
                return (
                  <article key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-bold text-gray-950">{campaign?.name ?? 'Campaign'}</p>
                    <p className="mt-1 text-sm text-gray-500">{organization?.name ?? 'Organization'} · {entry.status}</p>
                    <Link href={`/campaigns/${entry.campaign_id}?seller=${encodeURIComponent(entry.referral_code)}`} className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:underline">Open seller link →</Link>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
