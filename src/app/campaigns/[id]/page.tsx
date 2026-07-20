import Link from 'next/link'
import { redirect } from 'next/navigation'
import BuyCampaignPassButton from '@/app/components/buy-campaign-pass-button'
import SelectableCampaignCarousel from '@/app/components/selectable-campaign-carousel'
import ShareCampaignButton from '@/app/components/share-campaign-button'
import {
  buildCampaignDetailProgressState,
} from '@/lib/rules/campaign-progress-rules'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import {
  getCampaignById,
  getPublicCampaignProgress,
} from '@/lib/repositories/campaign-repository'
import { resolveCampaignRecovery } from '@/lib/services/campaign-recovery-service'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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

  return query
    ? `/campaigns/${input.campaignId}?${query}`
    : `/campaigns/${input.campaignId}`
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
            We could not load this campaign right now. Please return to the
            active fundraiser list and try again.
          </p>

          <div className="mt-6">
            <Link
              href="/campaigns"
              className="text-sm font-medium text-blue-700 hover:underline"
            >
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

    const noticeMessage =
      getCampaignNotice(notice) ??
      'The selected campaign is no longer accepting new sales. Choose an active campaign to continue.'

    if (recoveryResult.status === 'selection-required') {
      return (
        <main className="min-h-screen bg-slate-50 px-6 py-12">
          <div className="mx-auto max-w-6xl space-y-6">
            <Link
              href="/campaigns"
              className="text-sm text-blue-600"
            >
              ← Back to fundraisers
            </Link>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
              {noticeMessage}
            </div>

            <SelectableCampaignCarousel
              campaigns={recoveryResult.campaigns}
              seller={seller}
              replacedCampaignId={
                recoveryResult.replacedCampaignId
              }
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
          <Link
            href="/campaigns"
            className="text-sm text-blue-600"
          >
            ← Back to fundraisers
          </Link>

          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow">
            <h1 className="text-2xl font-bold text-blue-700">
              Campaign unavailable
            </h1>

            <p className="mt-3 text-sm text-gray-600">
              {noticeMessage}
            </p>

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
  let activePassExpiresAt: string | null = null

  if (user) {
    const passAccess = await getCustomerPassAccess(user.id, now)
    hasActivePass = passAccess.hasActivePass
    activePassExpiresAt =
      passAccess.activeEntitlement?.expires_at ?? null
  }

  const admin = createAdminClient()

  const [
    { data: campaignOrganization },
    { data: campaignOrganizationProfile },
  ] = await Promise.all([
    admin
      .from('organizations')
      .select('id')
      .eq('legacy_profile_id', campaign.organization_id)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('is_demo')
      .eq('id', campaign.organization_id)
      .maybeSingle(),
  ])

  const effectivePricing = await resolveEffectivePricing({
    campaignId: campaign.id,
    organizationId: campaignOrganization?.id ?? null,
    isDemo: campaignOrganizationProfile?.is_demo ?? false,
    now,
  })

  const goal = Number(campaign.goal_amount ?? 0)

  const {
    amountRaisedByCampaignId,
    error: progressError,
  } = await getPublicCampaignProgress([campaign.id])

  const progressState = buildCampaignDetailProgressState({
    amountRaised: amountRaisedByCampaignId.get(campaign.id),
    goalAmount: campaign.goal_amount,
    unavailable: Boolean(progressError),
  })

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/campaigns"
          className="text-sm text-blue-600"
        >
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
          {campaign.description ||
            'Support this local fundraiser.'}
        </p>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow">
          <p className="text-sm text-gray-500">
            Progress
          </p>

          {progressState.status === 'available' ? (
            <>
              <p className="mt-2 text-3xl font-bold text-blue-700">
                {progressState.goalPercentage.toFixed(0)}% of goal
              </p>

              <div className="mt-3 h-3 w-full rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-blue-600"
                  style={{
                    width: `${progressState.goalPercentage}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-sm text-gray-600">
                ${progressState.amountRaised.toLocaleString()} raised of $
                {goal.toLocaleString()}
              </p>

              {progressState.amountRemaining !== null ? (
                <p className="mt-1 text-sm text-gray-500">
                  ${progressState.amountRemaining.toLocaleString()} remaining
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold text-slate-600">
                Progress temporarily unavailable
              </p>

              <div className="mt-3 h-3 w-full rounded-full bg-slate-200" />

              <p className="mt-2 text-sm text-gray-600">
                Fundraising totals are temporarily unavailable. You can still
                support this campaign right now.
              </p>
            </>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          🎟️ Buy one pass. Save locally. Support your community.
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow">
          <p className="text-lg font-semibold text-gray-900">
            {hasActivePass
              ? 'Your pass is active'
              : 'Get your fundraising pass'}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            {hasActivePass
              ? 'You already have active RaiseHub access. You can still support this fundraiser with an additional donation.'
              : 'One purchase gives you access to exclusive local deals while supporting this campaign.'}
          </p>

          {hasActivePass ? (
            <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">
                Current pass expiration
              </p>

              <p className="mt-1 text-lg font-bold text-green-900">
                {activePassExpiresAt
                  ? new Date(
                      activePassExpiresAt
                    ).toLocaleDateString()
                  : 'No expiration date'}
              </p>

              <p className="mt-2 text-xs leading-5 text-green-700">
                Supporting another fundraiser will soon let you extend this
                date, gift a separate six-month pass, or donate without
                changing your current pass.
              </p>

              <button
                type="button"
                disabled
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-green-300 bg-white px-4 py-3 text-sm font-semibold text-green-800 opacity-70 sm:w-auto"
              >
                🎁 Gift a Pass — Coming Next
              </button>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <BuyCampaignPassButton
              campaignId={campaign.id}
              passPrice={effectivePricing.passPrice}
              organizations={organizations ?? []}
              defaultOrganizationId={
                campaign.organization_id
              }
              sellerName={seller || ''}
              hasActivePass={hasActivePass}
              initialDonationAmount={donation}
              initialSelectedOrganizationId={
                organization ?? null
              }
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