'use server'

import { headers } from 'next/headers'

import { getCampaignById } from '@/lib/repositories/campaign-repository'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import { resolveCampaignRecovery } from '@/lib/services/campaign-recovery-service'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createPurchasePricingSnapshot } from '@/lib/services/purchase-pricing-snapshot-core'
import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createStripeCheckoutSession, stripeIsConfigured } from '@/lib/stripe/server'
import type { CampaignRecoveryResult, SellableCampaignOption } from '@/lib/types/campaigns'

type CheckoutInput = {
  campaign_id: string
  selected_organization_id?: string
  donation_amount?: number
  seller_name?: string
  seller_referral?: string
}

type CheckoutResult =
  | { status: 'checkout-ready'; url: string }
  | {
      status: 'demo-complete'
      purchaseId: string
      entitlementId: string | null
      message: string
    }
  | { status: 'replacement-found'; campaignId: string; replacedCampaignId: string }
  | { status: 'selection-required'; replacedCampaignId: string; campaigns: SellableCampaignOption[] }
  | { status: 'no-valid-campaign'; replacedCampaignId: string | null }
  | { status: 'error'; message: string }

type DatabaseError = { message: string }
type CheckoutAttemptRow = { id: string }
type ManagedSellerRow = { id: string; display_name: string }
type UntypedQueryResult<T> = Promise<{ data: T | null; error: DatabaseError | null }>
type UntypedTable = {
  insert(values: Record<string, unknown>): {
    select(columns: string): { single(): UntypedQueryResult<CheckoutAttemptRow> }
  }
  update(values: Record<string, unknown>): {
    eq(column: string, value: string): UntypedQueryResult<unknown>
  }
  select(columns: string): UntypedTable
  eq(column: string, value: string): UntypedTable
  maybeSingle(): UntypedQueryResult<ManagedSellerRow>
}
type UntypedAdminClient = { from(table: string): UntypedTable }

type DemoClassification = {
  is_demo: boolean
  demo_group: string | null
}

function mapRecovery(result: CampaignRecoveryResult): CheckoutResult {
  if (result.status === 'replacement-found') return result
  if (result.status === 'selection-required') return result
  if (result.status === 'no-valid-campaign') return result
  return {
    status: 'error',
    message: result.status === 'lookup-failure'
      ? 'We could not refresh campaign availability. Please try again.'
      : 'We could not start checkout. Please try again.',
  }
}

function normalizeDonationAmount(value: number | undefined) {
  const normalized = Number(value ?? 0)
  if (!Number.isFinite(normalized)) return 0
  return Math.round(Math.max(0, normalized) * 100) / 100
}

function cleanOptionalText(value: string | undefined, maxLength: number) {
  const cleaned = value?.trim()
  return cleaned ? cleaned.slice(0, maxLength) : null
}

async function resolveOrigin() {
  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin')?.trim()
  if (origin) return origin.replace(/\/$/, '')
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

function resolveDemoGroup(
  classifications: DemoClassification[]
): string | null {
  const demoRows = classifications.filter((row) => row.is_demo)

  if (demoRows.length === 0) {
    return null
  }

  const groups = new Set(
    demoRows.map((row) => row.demo_group).filter(Boolean)
  )

  return groups.size === 1
    ? Array.from(groups)[0] ?? null
    : null
}

export async function createCampaignCheckoutAction(input: CheckoutInput): Promise<CheckoutResult> {
  const supabase = await createClient()
  const now = new Date()
  const { campaign, error: campaignError } = await getCampaignById(input.campaign_id)
  if (campaignError) return { status: 'error', message: 'We could not confirm this campaign. Please try again.' }
  if (!campaign || !isCampaignCurrentlySellable(campaign, now)) {
    return mapRecovery(await resolveCampaignRecovery(input.campaign_id, now))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Create an account or log in before purchasing a fundraiser pass.' }

  const admin = createAdminClient()
  const untypedAdmin = admin as unknown as UntypedAdminClient
  const selectedOrganizationId = campaign.organization_id

  const [
    canonicalOrganizationResult,
    organizationProfileResult,
    userProfileResult,
    campaignClassificationResult,
  ] = await Promise.all([
    admin.from('organizations').select('id').eq('legacy_profile_id', selectedOrganizationId).eq('status', 'active').is('archived_at', null).maybeSingle(),
    admin.from('profiles').select('is_demo, demo_group, role').eq('id', selectedOrganizationId).eq('role', 'organization').maybeSingle(),
    admin.from('profiles').select('is_demo, demo_group').eq('id', user.id).maybeSingle(),
    admin.from('campaigns').select('is_demo, demo_group').eq('id', campaign.id).maybeSingle(),
  ])

  if (
    canonicalOrganizationResult.error ||
    !canonicalOrganizationResult.data ||
    organizationProfileResult.error ||
    !organizationProfileResult.data ||
    userProfileResult.error ||
    !userProfileResult.data ||
    campaignClassificationResult.error ||
    !campaignClassificationResult.data
  ) {
    return { status: 'error', message: 'We could not confirm the campaign organization. Please try again.' }
  }

  const classifications: DemoClassification[] = [
    userProfileResult.data as DemoClassification,
    organizationProfileResult.data as DemoClassification,
    campaignClassificationResult.data as unknown as DemoClassification,
  ]
  const containsDemoData = classifications.some((row) => row.is_demo)
  const demoGroup = resolveDemoGroup(classifications)

  if (containsDemoData) {
    const allDemo = classifications.every((row) => row.is_demo)
    const allSameGroup =
      Boolean(demoGroup) &&
      classifications.every((row) => row.demo_group === demoGroup)

    if (!allDemo || !allSameGroup) {
      return {
        status: 'error',
        message: 'This demo checkout is not safely connected to one demo group. No payment was started.',
      }
    }
  }

  const passAccess = await getCustomerPassAccess(user.id, now)
  if (passAccess.error) return { status: 'error', message: 'We could not confirm your current pass access. Please try again.' }

  const donationAmount = normalizeDonationAmount(input.donation_amount)
  const isDonationOnly = passAccess.hasActivePass
  if (isDonationOnly && donationAmount <= 0) {
    return { status: 'error', message: 'Choose a donation amount to support this fundraiser.' }
  }

  let managedSeller: ManagedSellerRow | null = null
  const sellerReferral = cleanOptionalText(input.seller_referral, 64)
  if (sellerReferral) {
    const { data, error } = await untypedAdmin
      .from('campaign_sellers')
      .select('id, display_name')
      .eq('campaign_id', campaign.id)
      .eq('referral_code', sellerReferral)
      .eq('status', 'active')
      .maybeSingle()

    if (error) return { status: 'error', message: 'We could not confirm the selected seller. Please try again.' }
    managedSeller = data
  }

  const effectivePricing = isDonationOnly ? null : await resolveEffectivePricing({
    campaignId: campaign.id,
    organizationId: canonicalOrganizationResult.data.id,
    donationAmount,
    isDemo: containsDemoData,
    now,
  })

  if (!isDonationOnly && (!effectivePricing || effectivePricing.passPrice <= 0)) {
    return { status: 'error', message: 'This fundraiser does not currently have valid pass pricing.' }
  }

  const snapshot = createPurchasePricingSnapshot({ isDonationOnly, donationAmount, effectivePricing, pricingResolvedAt: now })
  const expectedAmountCents = Math.round(snapshot.amountPaid * 100)
  if (expectedAmountCents <= 0) return { status: 'error', message: 'Choose an amount greater than zero.' }

  const sellerNameSnapshot = managedSeller?.display_name ?? cleanOptionalText(input.seller_name, 120)

  if (containsDemoData && demoGroup) {
    const { data: simulatedRows, error: simulatedError } = await admin.rpc(
      'create_campaign_purchase_with_entitlement',
      {
        p_campaign_id: campaign.id,
        p_user_id: user.id,
        p_buyer_email: user.email ?? null,
        p_selected_organization_id: selectedOrganizationId,
        p_donation_amount: donationAmount,
        p_seller_name: sellerNameSnapshot,
        p_amount_paid: snapshot.amountPaid,
        p_platform_fee: snapshot.platformFee,
        p_organization_earnings: snapshot.organizationEarnings,
        p_is_demo: true,
        p_demo_group: demoGroup,
        p_grant_entitlement: snapshot.grantEntitlement,
        p_pricing_rule_id: snapshot.pricingRuleId,
        p_pricing_scope: snapshot.pricingScope,
        p_pass_price_charged: snapshot.passPriceCharged,
        p_platform_fee_percent: snapshot.platformFeePercent,
        p_organization_pass_earnings: snapshot.organizationPassEarnings,
        p_pricing_resolved_at: snapshot.pricingResolvedAt,
      }
    )

    const simulated = simulatedRows?.[0]

    if (simulatedError || !simulated?.purchase_id) {
      return {
        status: 'error',
        message: 'The simulated purchase could not be completed. No real payment was attempted.',
      }
    }

    return {
      status: 'demo-complete',
      purchaseId: simulated.purchase_id,
      entitlementId: simulated.entitlement_id,
      message: snapshot.grantEntitlement
        ? 'Demo purchase complete. No real payment was charged, and the demonstration pass is now active.'
        : 'Demo donation complete. No real payment was charged.',
    }
  }

  if (!stripeIsConfigured()) {
    return { status: 'error', message: 'Secure checkout is not configured yet. Please try again later.' }
  }

  const { data: attempt, error: attemptError } = await untypedAdmin
    .from('checkout_attempts')
    .insert({
      user_id: user.id,
      campaign_id: campaign.id,
      selected_organization_id: selectedOrganizationId,
      organization_workspace_id: canonicalOrganizationResult.data.id,
      buyer_email: user.email ?? null,
      seller_name: sellerNameSnapshot,
      campaign_seller_id: managedSeller?.id ?? null,
      campaign_seller_name_snapshot: managedSeller?.display_name ?? null,
      donation_amount: donationAmount,
      expected_amount_cents: expectedAmountCents,
      currency: 'usd',
      grant_entitlement: snapshot.grantEntitlement,
      pricing_rule_id: snapshot.pricingRuleId,
      pricing_scope: snapshot.pricingScope,
      pass_price_charged: snapshot.passPriceCharged,
      platform_fee: snapshot.platformFee,
      platform_fee_percent: snapshot.platformFeePercent,
      organization_pass_earnings: snapshot.organizationPassEarnings,
      organization_earnings: snapshot.organizationEarnings,
      pricing_resolved_at: snapshot.pricingResolvedAt,
      is_demo: false,
      demo_group: null,
      status: 'created',
    })
    .select('id')
    .single()

  if (attemptError || !attempt) return { status: 'error', message: 'We could not prepare secure checkout. Please try again.' }

  try {
    const origin = await resolveOrigin()
    const session = await createStripeCheckoutSession({
      attemptId: attempt.id,
      amountCents: expectedAmountCents,
      currency: 'usd',
      customerEmail: user.email ?? null,
      campaignName: campaign.name,
      successUrl: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/checkout/canceled?attempt=${encodeURIComponent(attempt.id)}&campaign=${encodeURIComponent(campaign.id)}`,
    })

    if (!session.url) throw new Error('Stripe did not return a checkout URL')
    const expiresAt = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
    const { error: updateError } = await untypedAdmin.from('checkout_attempts').update({
      status: 'open',
      stripe_checkout_session_id: session.id,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq('id', attempt.id)
    if (updateError) throw new Error(updateError.message)
    return { status: 'checkout-ready', url: session.url }
  } catch {
    await untypedAdmin.from('checkout_attempts').update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', attempt.id)
    return { status: 'error', message: 'Secure checkout could not be started. Please try again.' }
  }
}
