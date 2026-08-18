'use server'

import { createHash, randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import {
  getActiveDataEnvironment,
  recordMatchesEnvironment,
  recordsShareEnvironment,
  type EnvironmentOwnedRecord,
} from '@/lib/data-environment'
import { getCampaignById } from '@/lib/repositories/campaign-repository'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  createStripeCheckoutSession,
  stripeIsConfigured,
} from '@/lib/stripe/server'

const CLAIM_WINDOW_MONTHS = 12

export type GiftPassDeliveryMethod =
  | 'share_link'
  | 'printable'

export type PurchaseGiftPassInput = {
  campaignId: string
  recipientName?: string
  recipientEmail?: string
  personalMessage?: string
  deliveryMethod: GiftPassDeliveryMethod
  donationAmount?: number
  sellerName?: string
  sellerReferral?: string
}

export type PurchaseGiftPassResult =
  | {
      status: 'checkout-ready'
      url: string
    }
  | {
      status: 'demo-complete'
      giftId: string
      claimPath: string
      claimExpiresAt: string
      totalAmount: number
      message: string
    }
  | {
      status: 'error'
      message: string
    }

export type ClaimGiftPassResult =
  | {
      status: 'claimed'
      giftId: string
      entitlementId: string
      expiresAt: string
      alreadyClaimed: boolean
    }
  | {
      status: 'error'
      message: string
    }

type ClassifiedRecord = EnvironmentOwnedRecord & { id?: string }

type ManagedSellerRow = {
  id: string
  display_name: string
  campaign_id: string
  organization_id: string
}

function cleanOptionalText(
  value: string | undefined,
  maxLength: number
) {
  const cleaned = value?.trim()
  return cleaned ? cleaned.slice(0, maxLength) : null
}

function normalizeEmail(value: string | undefined) {
  const email = cleanOptionalText(value, 320)?.toLowerCase() ?? null
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function normalizeDonationAmount(value: number | undefined) {
  const normalized = Number(value ?? 0)
  if (!Number.isFinite(normalized)) return 0
  return Math.round(Math.max(0, normalized) * 100) / 100
}

function createClaimToken() {
  return randomBytes(32).toString('base64url')
}

export function hashGiftClaimToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function addMonths(date: Date, months: number) {
  const result = new Date(date)
  result.setUTCMonth(result.getUTCMonth() + months)
  return result
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

function recordsBelongToEnvironment(
  records: ClassifiedRecord[],
  environment: ReturnType<typeof getActiveDataEnvironment>
) {
  const first = records[0]
  return Boolean(first) &&
    records.every((record) => recordMatchesEnvironment(record, environment)) &&
    records.every((record) => recordsShareEnvironment(first, record))
}

export async function purchaseGiftPassAction(
  input: PurchaseGiftPassInput
): Promise<PurchaseGiftPassResult> {
  const environment = getActiveDataEnvironment()
  const supabase = await createClient()
  const now = new Date()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Create an account or log in before purchasing a gift pass.',
    }
  }

  const { campaign, error: campaignError } =
    await getCampaignById(input.campaignId, environment)

  if (
    campaignError ||
    !campaign ||
    !isCampaignCurrentlySellable(campaign, now)
  ) {
    return {
      status: 'error',
      message: 'This fundraiser is no longer available for new gift purchases.',
    }
  }

  if (!['share_link', 'printable'].includes(input.deliveryMethod)) {
    return {
      status: 'error',
      message: 'Choose a valid gift delivery option.',
    }
  }

  const recipientName = cleanOptionalText(input.recipientName, 120)
  const recipientEmailRaw = cleanOptionalText(input.recipientEmail, 320)
  const recipientEmail = normalizeEmail(input.recipientEmail)
  const personalMessage = cleanOptionalText(input.personalMessage, 500)

  if (recipientEmailRaw && !recipientEmail) {
    return {
      status: 'error',
      message: 'Enter a valid recipient email address or leave it blank.',
    }
  }

  const admin = createAdminClient() as any
  const selectedOrganizationId = campaign.organization_id

  const [
    canonicalOrganizationResult,
    organizationProfileResult,
    userProfileResult,
    campaignClassificationResult,
  ] = await Promise.all([
    admin
      .from('organizations')
      .select('id, is_demo, demo_group')
      .eq('legacy_profile_id', selectedOrganizationId)
      .eq('status', 'active')
      .is('archived_at', null)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('id, role, is_demo, demo_group')
      .eq('id', selectedOrganizationId)
      .eq('role', 'organization')
      .maybeSingle(),
    admin
      .from('profiles')
      .select('id, is_demo, demo_group')
      .eq('id', user.id)
      .maybeSingle(),
    admin
      .from('campaigns')
      .select('id, is_demo, demo_group')
      .eq('id', campaign.id)
      .maybeSingle(),
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
    return {
      status: 'error',
      message: 'We could not confirm this fundraiser for gifting. Please try again.',
    }
  }

  const classifiedRecords = [
    userProfileResult.data,
    organizationProfileResult.data,
    canonicalOrganizationResult.data,
    campaignClassificationResult.data,
  ] as ClassifiedRecord[]

  if (!recordsBelongToEnvironment(classifiedRecords, environment)) {
    return {
      status: 'error',
      message: 'This gift is not available in the active RaiseHub environment.',
    }
  }

  let managedSeller: ManagedSellerRow | null = null
  const sellerReferral = cleanOptionalText(input.sellerReferral, 64)

  if (sellerReferral) {
    const { data, error } = await admin
      .from('campaign_sellers')
      .select('id, display_name, campaign_id, organization_id')
      .eq('campaign_id', campaign.id)
      .eq('referral_code', sellerReferral)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      return {
        status: 'error',
        message: 'We could not confirm the selected seller. Please try again.',
      }
    }

    if (
      data &&
      (data.campaign_id !== campaign.id ||
        data.organization_id !== canonicalOrganizationResult.data.id)
    ) {
      return {
        status: 'error',
        message: 'The selected seller does not belong to this fundraiser.',
      }
    }

    managedSeller = data as ManagedSellerRow | null
  }

  const donationAmount = normalizeDonationAmount(input.donationAmount)
  const pricing = await resolveEffectivePricing({
    campaignId: campaign.id,
    organizationId: canonicalOrganizationResult.data.id,
    donationAmount,
    isDemo: environment.mode === 'demo',
    now,
  })

  if (pricing.passPrice <= 0) {
    return {
      status: 'error',
      message: 'This fundraiser does not currently have valid gift-pass pricing.',
    }
  }

  if (pricing.pricingRuleId) {
    const { data: pricingRule, error: pricingRuleError } = await admin
      .from('pricing_rules')
      .select('id, is_demo, demo_group')
      .eq('id', pricing.pricingRuleId)
      .maybeSingle()

    if (
      pricingRuleError ||
      !pricingRule ||
      !recordsBelongToEnvironment(
        [campaignClassificationResult.data, pricingRule] as ClassifiedRecord[],
        environment
      )
    ) {
      return {
        status: 'error',
        message: 'The fundraiser pricing rule is not valid in this environment.',
      }
    }
  }

  const totalAmount = Math.round((pricing.passPrice + donationAmount) * 100) / 100
  const expectedAmountCents = Math.round(totalAmount * 100)
  const claimToken = createClaimToken()
  const claimTokenHash = hashGiftClaimToken(claimToken)
  const claimExpiresAt = addMonths(now, CLAIM_WINDOW_MONTHS).toISOString()
  const sellerName = managedSeller?.display_name ?? cleanOptionalText(input.sellerName, 120)

  const { data: gift, error: giftError } = await admin
    .from('gift_passes')
    .insert({
      purchaser_user_id: user.id,
      campaign_id: campaign.id,
      selected_organization_id: selectedOrganizationId,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      recipient_phone: null,
      personal_message: personalMessage,
      delivery_method: input.deliveryMethod,
      status: 'pending_payment',
      claim_token_hash: claimTokenHash,
      claim_expires_at: claimExpiresAt,
      is_demo: environment.mode === 'demo',
      demo_group: environment.mode === 'demo' ? environment.demoGroup : null,
    })
    .select('id')
    .single()

  if (giftError || !gift) {
    return {
      status: 'error',
      message: 'We could not prepare the gift. Please try again.',
    }
  }

  const rpcArgs = {
    p_campaign_id: campaign.id,
    p_user_id: user.id,
    p_buyer_email: user.email ?? null,
    p_selected_organization_id: selectedOrganizationId,
    p_donation_amount: donationAmount,
    p_seller_name: sellerName,
    p_amount_paid: totalAmount,
    p_platform_fee: pricing.platformFeeAmount,
    p_organization_earnings: pricing.organizationTotalEarnings,
    p_is_demo: environment.mode === 'demo',
    p_demo_group: environment.mode === 'demo' ? environment.demoGroup : null,
    p_pricing_rule_id: pricing.pricingRuleId,
    p_pricing_scope: pricing.pricingScope,
    p_pass_price_charged: pricing.passPrice,
    p_platform_fee_percent: pricing.platformFeePercent,
    p_organization_pass_earnings: pricing.organizationPassEarnings,
    p_pricing_resolved_at: now.toISOString(),
  }

  if (environment.mode === 'demo') {
    const { data: purchaseId, error: purchaseError } = await admin.rpc(
      'create_campaign_gift_purchase',
      rpcArgs
    )

    if (purchaseError || !purchaseId) {
      await admin.from('gift_passes').delete().eq('id', gift.id)
      return {
        status: 'error',
        message: 'The simulated gift purchase could not be completed.',
      }
    }

    const { error: giftUpdateError } = await admin
      .from('gift_passes')
      .update({
        purchase_id: purchaseId,
        status: 'purchased',
        updated_at: new Date().toISOString(),
      })
      .eq('id', gift.id)

    if (giftUpdateError) {
      return {
        status: 'error',
        message: 'The demo gift purchase completed but its gift record needs attention.',
      }
    }

    revalidatePath('/dashboard')

    return {
      status: 'demo-complete',
      giftId: gift.id,
      claimPath: `/gifts/claim/${claimToken}`,
      claimExpiresAt,
      totalAmount,
      message: 'Demo gift created. No real payment was charged.',
    }
  }

  if (!stripeIsConfigured()) {
    await admin.from('gift_passes').delete().eq('id', gift.id)
    return {
      status: 'error',
      message: 'Secure checkout is not configured yet. Please try again later.',
    }
  }

  const { data: attempt, error: attemptError } = await admin
    .from('checkout_attempts')
    .insert({
      user_id: user.id,
      campaign_id: campaign.id,
      selected_organization_id: selectedOrganizationId,
      organization_workspace_id: canonicalOrganizationResult.data.id,
      buyer_email: user.email ?? null,
      seller_name: sellerName,
      campaign_seller_id: managedSeller?.id ?? null,
      campaign_seller_name_snapshot: managedSeller?.display_name ?? null,
      donation_amount: donationAmount,
      expected_amount_cents: expectedAmountCents,
      currency: 'usd',
      grant_entitlement: false,
      pricing_rule_id: pricing.pricingRuleId,
      pricing_scope: pricing.pricingScope,
      pass_price_charged: pricing.passPrice,
      platform_fee: pricing.platformFeeAmount,
      platform_fee_percent: pricing.platformFeePercent,
      organization_pass_earnings: pricing.organizationPassEarnings,
      organization_earnings: pricing.organizationTotalEarnings,
      pricing_resolved_at: now.toISOString(),
      is_demo: false,
      demo_group: null,
      status: 'created',
      purchase_kind: 'gift',
      gift_pass_id: gift.id,
    })
    .select('id')
    .single()

  if (attemptError || !attempt) {
    await admin.from('gift_passes').delete().eq('id', gift.id)
    return {
      status: 'error',
      message: 'We could not prepare secure gift checkout. Please try again.',
    }
  }

  try {
    const origin = await resolveOrigin()
    const encodedToken = encodeURIComponent(claimToken)
    const session = await createStripeCheckoutSession({
      attemptId: attempt.id,
      amountCents: expectedAmountCents,
      currency: 'usd',
      customerEmail: user.email ?? null,
      campaignName: `${campaign.name} — Gift Pass`,
      successUrl: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&gift=${encodedToken}`,
      cancelUrl: `${origin}/checkout/canceled?attempt=${encodeURIComponent(attempt.id)}&campaign=${encodeURIComponent(campaign.id)}`,
    })

    if (!session.url) throw new Error('Stripe did not return a checkout URL')

    const expiresAt = session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : null

    const { error: updateError } = await admin
      .from('checkout_attempts')
      .update({
        status: 'open',
        stripe_checkout_session_id: session.id,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attempt.id)

    if (updateError) throw updateError

    return { status: 'checkout-ready', url: session.url }
  } catch {
    await Promise.all([
      admin
        .from('checkout_attempts')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', attempt.id),
      admin
        .from('gift_passes')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', gift.id),
    ])

    return {
      status: 'error',
      message: 'Secure gift checkout could not be started. Please try again.',
    }
  }
}

export async function claimGiftPassAction(
  claimToken: string
): Promise<ClaimGiftPassResult> {
  const token = claimToken.trim()

  if (!token) {
    return { status: 'error', message: 'This gift link is incomplete.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Log in with the recipient account before claiming this gift.',
    }
  }

  const { data, error } = await (supabase as any).rpc('claim_gift_pass', {
    p_claim_token_hash: hashGiftClaimToken(token),
  })

  const result = data?.[0]

  if (error || !result?.gift_pass_id || !result?.entitlement_id) {
    return {
      status: 'error',
      message: error?.message || 'This gift could not be claimed. Please check the link and account.',
    }
  }

  revalidatePath('/dashboard')

  return {
    status: 'claimed',
    giftId: result.gift_pass_id,
    entitlementId: result.entitlement_id,
    expiresAt: result.expires_at,
    alreadyClaimed: Boolean(result.already_claimed),
  }
}
