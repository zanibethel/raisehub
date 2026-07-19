'use server'

import { createHash, randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import { getCampaignById } from '@/lib/repositories/campaign-repository'
import { getOrganizationPricingLocation } from '@/lib/services/organization-pricing-location-service'
import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const CLAIM_WINDOW_MONTHS = 12

export type GiftPassDeliveryMethod =
  | 'email'
  | 'sms'
  | 'share_link'
  | 'printable'

export type PurchaseGiftPassInput = {
  campaignId: string
  selectedOrganizationId?: string
  recipientName?: string
  recipientEmail?: string
  recipientPhone?: string
  personalMessage?: string
  deliveryMethod: GiftPassDeliveryMethod
  donationAmount?: number
  sellerName?: string
}

export type PurchaseGiftPassResult =
  | {
      status: 'success'
      giftId: string
      claimToken: string
      claimPath: string
      claimExpiresAt: string
      passPrice: number
      platformFeePercent: number
      totalAmount: number
    }
  | {
      status: 'error'
      message: string
    }

function cleanOptionalText(
  value: string | undefined,
  maxLength: number
) {
  const cleaned = value?.trim()

  if (!cleaned) {
    return null
  }

  return cleaned.slice(0, maxLength)
}

function normalizeEmail(value: string | undefined) {
  const email =
    cleanOptionalText(value, 320)?.toLowerCase() ?? null

  if (!email) {
    return null
  }

  const looksValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  return looksValid ? email : null
}

function normalizePhone(value: string | undefined) {
  const phone = cleanOptionalText(value, 40)

  if (!phone) {
    return null
  }

  const digitCount = phone.replace(/\D/g, '').length

  return digitCount >= 7 ? phone : null
}

function normalizeDonationAmount(value: number | undefined) {
  const normalized = Number(value ?? 0)

  if (!Number.isFinite(normalized)) {
    return 0
  }

  return Math.max(0, normalized)
}

function createClaimToken() {
  return randomBytes(32).toString('base64url')
}

function hashClaimToken(token: string) {
  return createHash('sha256')
    .update(token)
    .digest('hex')
}

function addMonths(date: Date, months: number) {
  const result = new Date(date)
  result.setUTCMonth(result.getUTCMonth() + months)
  return result
}

export async function purchaseGiftPassAction(
  input: PurchaseGiftPassInput
): Promise<PurchaseGiftPassResult> {
  const supabase = await createClient()
  const now = new Date()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message:
        'Create an account or log in before purchasing a gift pass.',
    }
  }

  const { campaign, error: campaignError } =
    await getCampaignById(input.campaignId)

  if (
    campaignError ||
    !campaign ||
    !isCampaignCurrentlySellable(campaign, now)
  ) {
    return {
      status: 'error',
      message:
        'This fundraiser is no longer available for new gift purchases.',
    }
  }

  const deliveryMethod = input.deliveryMethod
  const allowedDeliveryMethods: GiftPassDeliveryMethod[] = [
    'email',
    'sms',
    'share_link',
    'printable',
  ]

  if (!allowedDeliveryMethods.includes(deliveryMethod)) {
    return {
      status: 'error',
      message: 'Choose a valid gift delivery method.',
    }
  }

  const recipientName = cleanOptionalText(
    input.recipientName,
    120
  )
  const recipientEmail = normalizeEmail(
    input.recipientEmail
  )
  const recipientPhone = normalizePhone(
    input.recipientPhone
  )
  const personalMessage = cleanOptionalText(
    input.personalMessage,
    500
  )

  if (deliveryMethod === 'email' && !recipientEmail) {
    return {
      status: 'error',
      message:
        'Enter a valid recipient email address for email delivery.',
    }
  }

  if (deliveryMethod === 'sms' && !recipientPhone) {
    return {
      status: 'error',
      message:
        'Enter a valid recipient phone number for text delivery.',
    }
  }

  const selectedOrganizationId =
    input.selectedOrganizationId?.trim() ||
    campaign.organization_id

  const donationAmount = normalizeDonationAmount(
    input.donationAmount
  )

  const admin = createAdminClient()

  const {
    data: selectedOrganizationProfile,
    error: organizationProfileError,
  } = await admin
    .from('profiles')
    .select('id, role, is_demo')
    .eq('id', selectedOrganizationId)
    .eq('role', 'organization')
    .maybeSingle()

  if (
    organizationProfileError ||
    !selectedOrganizationProfile
  ) {
    return {
      status: 'error',
      message:
        'Choose a valid organization to receive this support.',
    }
  }

  const {
    data: organizationRecord,
    error: organizationRecordError,
  } = await admin
    .from('organizations')
    .select('id')
    .eq('legacy_profile_id', selectedOrganizationId)
    .maybeSingle()

  if (organizationRecordError) {
    return {
      status: 'error',
      message:
        'We could not confirm organization pricing. Please try again.',
    }
  }

  const organizationPricingLocation =
    await getOrganizationPricingLocation(
      organizationRecord?.id ?? null
    )

  const pricing = await resolveEffectivePricing({
    campaignId: campaign.id,
    organizationId: organizationRecord?.id ?? null,
    townName:
      organizationPricingLocation.townName,
    stateCode:
      organizationPricingLocation.stateCode,
    donationAmount,
    isDemo: selectedOrganizationProfile.is_demo,
    now,
  })

  if (pricing.passPrice <= 0) {
    return {
      status: 'error',
      message:
        'This fundraiser does not currently have valid gift-pass pricing.',
    }
  }

  const {
    data: purchase,
    error: purchaseError,
  } = await admin
    .from('campaign_purchases')
    .insert({
      campaign_id: campaign.id,
      user_id: user.id,
      buyer_email: user.email ?? null,
      amount_paid: pricing.totalAmount,
      platform_fee: pricing.platformFeeAmount,
      organization_earnings:
        pricing.organizationTotalEarnings,
      selected_organization_id:
        selectedOrganizationId,
      donation_amount: pricing.donationAmount,
      seller_name:
        cleanOptionalText(input.sellerName, 120),
      payment_status: 'test_paid',
      pricing_rule_id: pricing.pricingRuleId,
      pricing_scope: pricing.pricingScope,
      pass_price_charged: pricing.passPrice,
      platform_fee_percent:
        pricing.platformFeePercent,
      organization_pass_earnings:
        pricing.organizationPassEarnings,
      pricing_resolved_at: now.toISOString(),
    })
    .select('id')
    .single()

  if (purchaseError || !purchase) {
    return {
      status: 'error',
      message:
        'We could not record the gift purchase. Please try again.',
    }
  }

  const claimToken = createClaimToken()
  const claimTokenHash = hashClaimToken(claimToken)
  const claimExpiresAt = addMonths(
    now,
    CLAIM_WINDOW_MONTHS
  ).toISOString()

  const {
    data: gift,
    error: giftError,
  } = await admin
    .from('gift_passes')
    .insert({
      purchaser_user_id: user.id,
      campaign_id: campaign.id,
      selected_organization_id:
        selectedOrganizationId,
      purchase_id: purchase.id,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      recipient_phone: recipientPhone,
      personal_message: personalMessage,
      delivery_method: deliveryMethod,
      status: 'purchased',
      claim_token_hash: claimTokenHash,
      claim_expires_at: claimExpiresAt,
      is_demo: selectedOrganizationProfile.is_demo,
    })
    .select('id')
    .single()

  if (giftError || !gift) {
    await admin
      .from('campaign_purchases')
      .delete()
      .eq('id', purchase.id)

    return {
      status: 'error',
      message:
        'We could not finish creating the gift. No gift record was saved.',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/campaigns/${campaign.id}`)
  revalidatePath('/campaigns')

  return {
    status: 'success',
    giftId: gift.id,
    claimToken,
    claimPath: `/gifts/claim/${claimToken}`,
    claimExpiresAt,
    passPrice: pricing.passPrice,
    platformFeePercent:
      pricing.platformFeePercent,
    totalAmount: pricing.totalAmount,
  }
}