import Link from 'next/link'
import { redirect } from 'next/navigation'
import BuyCampaignPassButton from '@/app/components/buy-campaign-pass-button'
import GiftCampaignPassButton from '@/app/components/gift-campaign-pass-button'
import SelectableCampaignCarousel from '@/app/components/selectable-campaign-carousel'
import ShareCampaignButton from '@/app/components/share-campaign-button'
import {
  buildCampaignDetailProgressState,
  isCampaignPurchaseProgressEligible,
} from '@/lib/rules/campaign-progress-rules'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import {
  getCampaignById,
  getPublicCampaignProgress,
} from '@/lib/repositories/campaign-repository'
import {
  getActiveDataEnvironment,
  isMissingEnvironmentAwareRpc,
  resolveDataEnvironment,
  toRpcEnvironmentExpectation,
} from '@/lib/data-environment'
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
    live?: string | string[]
  }>
}

type ManagedSellerResolution = {
  campaign_seller_id: string
  display_name: string
  valid_for_attribution: boolean
}

type PublicSellerProgress = {
  passesSold: number
  amountRaised: number
}

type SellerProgressPurchase = {
  payment_status: string | null
  organization_earnings: number | string | null
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

  if (input.seller) searchParams.set('seller', input.seller)
  if (input.notice) searchParams.set('notice', input.notice)
  if (input.replaced) searchParams.set('replaced', input.replaced)
  if (input.donation) searchParams.set('donation', input.donation)
  if (input.organization) searchParams.set('organization', input.organization)

  const query = searchParams.toString()
  return query ? `/campaigns/${input.campaignId}?${query}` : `/campaigns/${input.campaignId}`
}

function getCampaignNotice(
  notice: 'campaign-unavailable' | 'campaign-replaced' | undefined
) {
  if (!notice) return null
  return 'The selected campaign is no longer accepting new sales. Choose an active campaign to continue.'
}

export default async function CampaignPage({
  params,
  searchParams,
}: CampaignPageProps) {
  const { id } = await params
  const { seller, notice, donation, organization, live } = await searchParams
  const supabase = await createClient()
  const now = new Date()
  const forceProduction =
    (Array.isArray(live) ? live[0] : live) === '1'
  const environment = forceProduction
    ? resolveDataEnvironment('production')
    : getActiveDataEnvironment()
  const { campaign, error } = await getCampaignById(
    id,
    environment
  )

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-blue-100 bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-blue-700">Campaign unavailable</h1>
          <p className="mt-3 text-sm text-gray-600">
            We could not load this campaign right now. Please return to the active fundraiser list and try again.
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
    const recoveryResult =
      await resolveCampaignRecovery(
        id,
        now,
        environment
      )

    if (recoveryResult.status === 'replacement-found') {
      redirect(buildCampaignHref({
        campaignId: recoveryResult.campaignId,
        seller,
        notice: 'campaign-replaced',
        replaced: recoveryResult.replacedCampaignId,
        donation,
        organization,
      }))
    }

    const noticeMessage = getCampaignNotice(notice) ??
      'The selected campaign is no longer accepting new sales. Choose an active campaign to continue.'

    if (recoveryResult.status === 'selection-required') {
      return (
        <main className="min-h-screen bg-slate-50 px-6 py-12">
          <div className="mx-auto max-w-6xl space-y-6">
            <Link href="/campaigns" className="text-sm text-blue-600">← Back to fundraisers</Link>
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
          <Link href="/campaigns" className="text-sm text-blue-600">← Back to fundraisers</Link>
          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow">
            <h1 className="text-2xl font-bold text-blue-700">Campaign unavailable</h1>
            <p className="mt-3 text-sm text-gray-600">{noticeMessage}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/campaigns" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Browse active campaigns
              </Link>
              <Link href="/" className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
                Return home
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()
  const noticeMessage = getCampaignNotice(notice)
  const { data: organizations } = await supabase
    .from('profiles')
    .select('id, business_name, display_name, logo_url')
    .eq('role', 'organization')
    .order('business_name', { ascending: true })

  let hasActivePass = false
  let activePassExpiresAt: string | null = null

  if (user) {
    const passAccess = await getCustomerPassAccess(user.id, now)
    hasActivePass = passAccess.hasActivePass
    activePassExpiresAt = passAccess.activeEntitlement?.expires_at ?? null
  }

  const admin = createAdminClient()
  const isManagedSellerCode = Boolean(seller && /^[a-f0-9]{14}$/i.test(seller))
  let managedSeller: ManagedSellerResolution | null = null

  if (seller && isManagedSellerCode) {
    let rpcResult = await (admin as any).rpc('resolve_campaign_seller_referral', {
      p_campaign_id: campaign.id,
      p_referral_code: seller,
      ...toRpcEnvironmentExpectation(environment),
    })

    if (
      rpcResult.error &&
      isMissingEnvironmentAwareRpc(
        rpcResult.error,
        'resolve_campaign_seller_referral'
      )
    ) {
      rpcResult = await (admin as any).rpc('resolve_campaign_seller_referral', {
        p_campaign_id: campaign.id,
        p_referral_code: seller,
      })
    }

    const { data } = rpcResult
    managedSeller = ((data ?? [])[0] ?? null) as ManagedSellerResolution | null
  }

  let sellerProgress: PublicSellerProgress | null = null

  if (managedSeller?.valid_for_attribution) {
    // campaign_seller_id exists in the live schema but is not yet represented
    // in the generated database types used by this repository.
    const { data: sellerPurchases, error: sellerProgressError } = await (admin as any)
      .from('campaign_purchases')
      .select('payment_status, organization_earnings')
      .eq('campaign_id', campaign.id)
      .eq('campaign_seller_id', managedSeller.campaign_seller_id)

    if (!sellerProgressError) {
      const sellerPurchaseRows = (sellerPurchases ?? []) as SellerProgressPurchase[]
      const qualifyingPurchases = sellerPurchaseRows.filter((purchase) =>
        isCampaignPurchaseProgressEligible(purchase.payment_status)
      )

      sellerProgress = {
        passesSold: qualifyingPurchases.length,
        amountRaised: qualifyingPurchases.reduce(
          (sum: number, purchase: SellerProgressPurchase) =>
            sum + Number(purchase.organization_earnings ?? 0),
          0
        ),
      }
    }
  }

  const attributedSellerName = managedSeller?.valid_for_attribution
    ? managedSeller.display_name
    : isManagedSellerCode
      ? ''
      : seller || ''

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
  const { amountRaisedByCampaignId, error: progressError } = await getPublicCampaignProgress(
    [campaign.id],
    environment
  )
  const progressState = buildCampaignDetailProgressState({
    amountRaised: amountRaisedByCampaignId.get(campaign.id),
    goalAmount: campaign.goal_amount,
    unavailable: Boolean(progressError),
  })

  const campaignOrganizationProfile = (organizations ?? []).find(
    (candidate) => candidate.id === campaign.organization_id
  )
  const campaignOrganizationName =
    campaignOrganizationProfile?.display_name ||
    campaignOrganizationProfile?.business_name ||
    'Local organization'
  const campaignOrganizationLogo = campaignOrganizationProfile?.logo_url ?? null
  const campaignInitials = campaignOrganizationName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  const campaignEndDate = campaign.ends_at ? new Date(campaign.ends_at) : null
  const campaignDaysRemaining =
    campaignEndDate && !Number.isNaN(campaignEndDate.getTime())
      ? Math.max(0, Math.ceil((campaignEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null
  const passPriceLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(effectivePricing.passPrice)

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/campaigns"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Back to fundraisers
        </Link>

        {noticeMessage ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            {noticeMessage}
          </div>
        ) : null}

        {managedSeller?.valid_for_attribution ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">
              ✓
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Seller link recognized
              </p>
              <p className="mt-0.5 text-sm font-bold text-emerald-950">
                Your purchase will be credited to {managedSeller.display_name}.
              </p>
            </div>
          </div>
        ) : seller && isManagedSellerCode ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            This seller code is no longer eligible for new credit. Your purchase will still support the campaign.
          </div>
        ) : null}

        <section className="relative mt-5 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-500/25 blur-2xl" />
          <div className="absolute -bottom-20 right-20 h-52 w-52 rounded-full bg-green-400/15 blur-2xl" />

          <div className="relative z-10 flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 text-xl font-black text-blue-700 shadow-lg sm:h-20 sm:w-20">
              {campaignOrganizationLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={campaignOrganizationLogo}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                campaignInitials || 'RH'
              )}
            </span>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">
                {campaignOrganizationName}
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                {campaign.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {campaign.description || 'Support this local fundraiser and unlock RaiseHub savings.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-blue-100">
                  {passPriceLabel} pass
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-green-100">
                  {campaignDaysRemaining === null
                    ? 'Flexible timeline'
                    : campaignDaysRemaining === 1
                      ? '1 day remaining'
                      : `${campaignDaysRemaining} days remaining`}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Campaign progress
              </p>
              {progressState.status === 'available' ? (
                <p className="mt-1 text-3xl font-black text-slate-950">
                  {progressState.goalPercentage.toFixed(0)}%
                </p>
              ) : (
                <p className="mt-1 text-xl font-black text-slate-700">
                  Progress temporarily unavailable
                </p>
              )}
            </div>

            {progressState.status === 'available' ? (
              <div className="text-right">
                <p className="text-lg font-black text-green-700">
                  ${progressState.amountRaised.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-slate-500">
                  raised of ${goal.toLocaleString()}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${
                progressState.status === 'available' ? 'bg-green-600' : 'bg-slate-300'
              }`}
              style={{
                width:
                  progressState.status === 'available'
                    ? `${progressState.goalPercentage}%`
                    : '0%',
              }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                progressState.status === 'available'
                  ? Math.round(progressState.goalPercentage)
                  : undefined
              }
            />
          </div>

          {progressState.status === 'available' && progressState.amountRemaining !== null ? (
            <p className="mt-3 text-sm font-semibold text-slate-500">
              ${progressState.amountRemaining.toLocaleString()} remaining to reach the goal
            </p>
          ) : progressState.status !== 'available' ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Fundraising totals are temporarily unavailable, but you can still support this campaign.
            </p>
          ) : null}
        </section>

        {managedSeller?.valid_for_attribution && sellerProgress ? (
          <section className="mt-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Seller progress
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Help {managedSeller.display_name} keep the momentum going
              </h2>
            </div>

            <div className="mt-3 grid grid-cols-2 divide-x divide-slate-200 border-y border-slate-200 py-4 text-center">
              <div className="px-3">
                <p className="text-2xl font-black text-emerald-700">
                  {sellerProgress.passesSold}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">Passes credited</p>
              </div>
              <div className="px-3">
                <p className="text-2xl font-black text-emerald-700">
                  ${sellerProgress.amountRaised.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">Helped raise</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
                Support this fundraiser
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {hasActivePass ? 'Your pass is already active' : 'Get your RaiseHub Pass'}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800">
              {passPriceLabel}
            </span>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {hasActivePass
              ? 'You can still support this fundraiser with an additional donation or send a separate pass as a gift.'
              : 'One purchase supports this campaign and unlocks exclusive local offers through your RaiseHub Pass.'}
          </p>

          {hasActivePass ? (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">
                Current pass
              </p>
              <p className="mt-1 text-sm font-bold text-green-950">
                {activePassExpiresAt
                  ? `Active through ${new Date(activePassExpiresAt).toLocaleDateString()}`
                  : 'Active with no listed expiration'}
              </p>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="space-y-3">
              <BuyCampaignPassButton
                campaignId={campaign.id}
                passPrice={effectivePricing.passPrice}
                organizations={organizations ?? []}
                defaultOrganizationId={campaign.organization_id}
                sellerName={attributedSellerName}
                hasActivePass={hasActivePass}
                initialDonationAmount={donation}
                initialSelectedOrganizationId={organization ?? null}
              />
              <GiftCampaignPassButton
                campaignId={campaign.id}
                passPrice={effectivePricing.passPrice}
                sellerName={attributedSellerName}
              />
              <div className="flex justify-center pt-1">
                <ShareCampaignButton campaignId={campaign.id} campaignName={campaign.name} />
              </div>
            </div>

            <p className="mt-4 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
              100% of optional donations go directly to the selected organization.
            </p>
          </div>
        </section>

        <section className="mt-7 border-y border-slate-200 py-5">
          <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
            <div className="px-2">
              <p className="text-lg font-black text-blue-700">Local</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">Supports organizations</p>
            </div>
            <div className="px-2">
              <p className="text-lg font-black text-green-700">Useful</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">Unlocks local offers</p>
            </div>
            <div className="px-2">
              <p className="text-lg font-black text-amber-700">Shareable</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">Buy or send as a gift</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
