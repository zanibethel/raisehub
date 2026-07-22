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
import {
  createStripeCheckoutSession,
  stripeIsConfigured,
} from '@/lib/stripe/server'
import type {
  CampaignRecoveryResult,
  SellableCampaignOption,
} from '@/lib/types/campaigns'

type CheckoutInput = {
  campaign_id: string
  selected_organization_id?: string
  donation_amount?: number
  seller_name?: string
}

type CheckoutResult =
  | { status: 'checkout-ready'; url: string }
  | { status: 'replacement-found'; campaignId: string; replacedCampaignId: string }
  | { status: 'selection-required'; replacedCampaignId: string; campaigns: SellableCampaignOption[] }
  | { status: 'no-valid-campaign'; replacedCampaignId: string | null }
  | { status: 'error'; message: string }

type DatabaseError = { message: string }
type CheckoutAttemptRow = { id: string }
type UntypedQueryResult<T> = Promise<{ data: T | null; error: DatabaseError | null }>
type UntypedTable = {
  insert(values: Record<string, unknown>): {
    select(columns: string): {
      single(): UntypedQueryResult<CheckoutAttemptRow>
    }
  }
  update(values: Record<string, unknown>): {
    eq(column: string, value: string): UntypedQueryResult<unknown>
  }
}
type UntypedAdminClient = {
  from(table: string): UntypedTable
}

function mapRecovery(result: CampaignRecoveryResult): CheckoutResult {
  if (result.status === 'replacement-found') return result
  if (result.status === 'selection-required') return result
  if (result.status === 'no-valid-campaign') return result

  return {
    status: 'error',
    message:
      result.status === 'lookup-failure'
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

export async function createCampaignCheckoutAction(
  input: CheckoutInput
): Promise<CheckoutResult> {
  if (!stripeIsConfigured()) {
    return {
      status: 'error',
      message: 'Secure checkout is not configured yet. Please try again later.',
    }
  }

  const supabase = await createClient()
  const now = new Date()
  const { campaign, error: campaignError } = await getCampaignById(input.campaign_id)

  if (campaignError) {
    return { status: 'error', message: 'We could not confirm this campaign. Please try again.' }
  }

  if (!campaign || !isCampaignCurrentlySellable(campaign, now)) {
    return mapRecovery(await resolveCampaignRecovery(input.campaign_id, now))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Create an account or log in before purchasing a fundraiser pass.' }
  }

  const passAccess = await getCustomerPassAccess(user.id, now)
  if (passAccess.error) {
    return { status: 'error', message: 'We could not confirm your current pass access. Please try again.' }
  }

  const donationAmount = normalizeDonationAmount(input.donation_amount)
  const isDonationOnly = passAccess.hasActivePass

  if (isDonationOnly && donationAmount <= 0) {
    return { status: 'error', message: 'Choose a donation amount to support this fundraiser.' }
  }

  const admin = createAdminClient()
  const selectedOrganizationId =
    input.selected_organization_id?.trim() || campaign.organization_id

  const { data: selectedOrganization, error: selectedOrganizationError } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', selectedOrganizationId)
    .eq('role', 'organization')
    .maybeSingle()

  if (selectedOrganizationError || !selectedOrganization) {
    return { status: 'error', message: 'Choose a valid organization to receive this support.' }
  }

  const [canonicalOrganizationResult, organizationProfileResult] = await Promise.all([
    admin
      .from('organizations')
      .select('id')
      .eq('legacy_profile_id', campaign.organization_id)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('is_demo, demo_group')
      .eq('id', campaign.organization_id)
      .maybeSingle(),
  ])

  if (
    canonicalOrganizationResult.error ||
    organizationProfileResult.error ||
    !organizationProfileResult.data
  ) {
    return { status: 'error', message: 'We could not confirm campaign pricing. Please try again.' }
  }

  const effectivePricing = isDonationOnly
    ? null
    : await resolveEffectivePricing({
        campaignId: campaign.id,
        organizationId: canonicalOrganizationResult.data?.id ?? null,
        donationAmount,
        isDemo: organizationProfileResult.data.is_demo,
        now,
      })

  if (!isDonationOnly && (!effectivePricing || effectivePricing.passPrice <= 0)) {
    return { status: 'error', message: 'This fundraiser does not currently have valid pass pricing.' }
  }

  const snapshot = createPurchasePricingSnapshot({
    isDonationOnly,
    donationAmount,
    effectivePricing,
    pricingResolvedAt: now,
  })
  const expectedAmountCents = Math.round(snapshot.amountPaid * 100)

  if (expectedAmountCents <= 0) {
    return { status: 'error', message: 'Choose an amount greater than zero.' }
  }

  const untypedAdmin = admin as unknown as UntypedAdminClient
  const { data: attempt, error: attemptError } = await untypedAdmin
    .from('checkout_attempts')
    .insert({
      user_id: user.id,
      campaign_id: campaign.id,
      selected_organization_id: selectedOrganizationId,
      buyer_email: user.email ?? null,
      seller_name: cleanOptionalText(input.seller_name, 120),
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
      is_demo: organizationProfileResult.data.is_demo,
      demo_group: organizationProfileResult.data.demo_group,
      status: 'created',
    })
    .select('id')
    .single()

  if (attemptError || !attempt) {
    return { status: 'error', message: 'We could not prepare secure checkout. Please try again.' }
  }

  try {
    const origin = await resolveOrigin()
    const session = await createStripeCheckoutSession({
      attemptId: attempt.id,
      amountCents: expectedAmountCents,
      currency: 'usd',
      customerEmail: user.email ?? null,
      campaignName: campaign.name,
      successUrl: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/campaigns/${campaign.id}?checkout=canceled`,
    })

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL')
    }

    const expiresAt = session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : null

    const { error: updateError } = await untypedAdmin
      .from('checkout_attempts')
      .update({
        status: 'open',
        stripe_checkout_session_id: session.id,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attempt.id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return { status: 'checkout-ready', url: session.url }
  } catch {
    await untypedAdmin
      .from('checkout_attempts')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', attempt.id)

    return { status: 'error', message: 'Secure checkout could not be started. Please try again.' }
  }
}
