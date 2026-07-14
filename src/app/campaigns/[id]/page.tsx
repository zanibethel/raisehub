import Link from 'next/link'
import { redirect } from 'next/navigation'
import BuyCampaignPassButton from '@/app/components/buy-campaign-pass-button'
import SelectableCampaignCarousel from '@/app/components/selectable-campaign-carousel'
import ShareCampaignButton from '@/app/components/share-campaign-button'
import { isCampaignPurchaseProgressEligible } from '@/lib/rules/campaign-progress-rules'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import { getCampaignById } from '@/lib/repositories/campaign-repository'
import { createClient } from '@/lib/supabase/server'
import { resolveCampaignRecovery } from '@/lib/services/campaign-recovery-service'

export const dynamic = 'force-dynamic'

type CampaignPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    seller?: string
    notice?: 'campaign-unavailable' | 'campaign-replaced'
    replaced?: string
    donation?: string
    organization?: string
  }>
}

type PurchaseRow = {
  organization_earnings: number | null
  payment_status: string
}

function buildCampaignHref(input: {
  campaignId: string
  seller?: string
  notice?: 'campaign-unavailable' | 'campaign-replaced'
  replaced?: string
  donation?: string
  organization?: string
}) {
  const searchParams = new URLSearchParams()

  if (input.seller) {
    searchParams.set('seller', input.seller)
  }

  if (input.notice) {
    searchParams.set('notice', input.notice)
  }

  if (input.replaced) {
    searchParams.set('replaced', input.replaced)
  }

  if (input.donation) {
    searchParams.set('donation', input.donation)
  }

  if (input.organization) {
    searchParams.set('organization', input.organization)
  }

  const query = searchParams.toString()

  return query ? `/campaigns/${input.campaignId}?${query}` : `/campaigns/${input.campaignId}`
}

function getCampaignNotice(
  notice: 'campaign-unavailable' | 'campaign-replaced' | undefined
) {
  if (!notice) {
    return null
  }

  return 'The selected campaign is no longer accepting new sales. Choose an active campaign to continue.'
}

export default async function CampaignPage({
  params,
  searchParams,
}: CampaignPageProps) {
  const { id } = await params
  const {
    seller,
    notice,
    donation,
    organization,
  } = await searchParams
  const supabase = await createClient()
  const now = new Date()

  const { campaign, error } = await getCampaignById(id)

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-blue-100 bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-blue-700">
            Campaign unavailable
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            We could not load this campaign right now. Please return to the active
            fundraiser list and try again.
          </p>
          <div className="mt-6">
            <Link href="/campaigns" className="text-sm font-medium text-blue-700 hover:underline">
              Browse active campaigns →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (!campaign || !isCampaignCurrentlySellable(campaign, now)) {
    const recoveryResult = await resolveCampaignRecovery(id, now)

    if (recoveryResult.status === 'replacement-found') {
      redirect(
        buildCampaignHref({
          campaignId: recoveryResult.campaignId,
          seller,
          notice: 'campaign-replaced',
          replaced: recoveryResult.replacedCampaignId,
          donation,
          organization,
        })
      )
    }

    const noticeMessage = getCampaignNotice(notice) ??
      'The selected campaign is no longer accepting new sales. Choose an active campaign to continue.'

    if (recoveryResult.status === 'selection-required') {
      return (
        <main className="min-h-screen bg-slate-50 px-6 py-12">
          <div className="mx-auto max-w-6xl space-y-6">
            <Link href="/campaigns" className="text-sm text-blue-600">
              ← Back to fundraisers
            </Link>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
              {noticeMessage}
            </div>

            <SelectableCampaignCarousel
              campaigns={recoveryResult.campaigns}
              seller={seller}
              replacedCampaignId={recoveryResult.replacedCampaignId}
              notice="campaign-unavailable"
              donationAmount={donation}
              selectedOrganizationId={organization}
              actionLabel="Support This Campaign"
              title="Choose an active campaign to continue"
              description="Only currently sellable campaigns from the same organization are available here."
            />
          </div>
        </main>
      )
    }

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link href="/campaigns" className="text-sm text-blue-600">
            ← Back to fundraisers
          </Link>

          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow">
            <h1 className="text-2xl font-bold text-blue-700">
              Campaign unavailable
            </h1>
            <p className="mt-3 text-sm text-gray-600">{noticeMessage}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/campaigns"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Browse active campaigns
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                Return home
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const noticeMessage = getCampaignNotice(notice)

  const { data: organizations } = await supabase
    .from('profiles')
    .select('id, business_name, display_name')
    .eq('role', 'organization')
    .order('business_name', { ascending: true })

  let hasActivePass = false

  if (user) {
    const { data: existingPurchase } = await supabase
      .from('campaign_purchases')
      .select('id, payment_status')
      .eq('campaign_id', campaign.id)
      .eq('user_id', user.id)
      .limit(10)

    hasActivePass = (existingPurchase ?? []).some((purchase) =>
      isCampaignPurchaseProgressEligible(purchase.payment_status)
    )
  }

  const { data: purchases } = await supabase
    .from('campaign_purchases')
    .select('organization_earnings, payment_status')
    .eq('campaign_id', campaign.id)

  const earnings = ((purchases ?? []) as PurchaseRow[]).reduce(
    (sum, purchase) =>
      isCampaignPurchaseProgressEligible(purchase.payment_status)
        ? sum + Number(purchase.organization_earnings ?? 0)
        : sum,
    0
  )

  const goal = Number(campaign.goal_amount ?? 0)
  const progress = goal > 0 ? Math.min((earnings / goal) * 100, 100) : 0

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/campaigns" className="text-sm text-blue-600">
          ← Back to fundraisers
        </Link>

        {noticeMessage ? (
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
            {noticeMessage}
          </div>
        ) : null}

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          {campaign.name}
        </h1>

        <p className="mt-2 text-gray-600">
          {campaign.description || 'Support this local fundraiser.'}
        </p>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow">
          <p className="text-sm text-gray-500">Progress</p>

          <p className="mt-2 text-3xl font-bold text-blue-700">
            {progress.toFixed(0)}% of goal
          </p>

          <div className="mt-3 h-3 w-full rounded-full bg-gray-200">
            <div
              className="h-3 rounded-full bg-blue-600"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-gray-600">
            ${earnings.toLocaleString()} raised of ${goal.toLocaleString()}
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          🎟️ Buy one pass. Save locally. Support your community.
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow">
          <p className="text-lg font-semibold text-gray-900">
            {hasActivePass ? 'Your pass is active' : 'Get your fundraising pass'}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            {hasActivePass
              ? 'You already have access to this fundraiser pass. You can still make an additional donation.'
              : 'One purchase gives you access to exclusive local deals while supporting this campaign.'}
          </p>

          <div className="mt-4 space-y-3">
            <BuyCampaignPassButton
              campaignId={campaign.id}
              passPrice={Number(campaign.pass_price ?? 0)}
              organizations={organizations ?? []}
              defaultOrganizationId={campaign.organization_id}
              sellerName={seller || ''}
              hasActivePass={hasActivePass}
              initialDonationAmount={donation}
              initialSelectedOrganizationId={organization ?? null}
            />

            <div className="flex justify-center">
              <ShareCampaignButton
                campaignId={campaign.id}
                campaignName={campaign.name}
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            100% of donations go directly to the selected organization.
          </p>
        </div>

        <div className="mt-6 space-y-2 text-sm text-gray-600">
          <p>✔ Supports local organizations</p>
          <p>✔ Powered by local businesses</p>
          <p>✔ Easy to use digital pass</p>
        </div>
      </div>
    </main>
  )
}
