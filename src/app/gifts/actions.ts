'use server'

import { createHash, randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import { getCampaignById } from '@/lib/repositories/campaign-repository'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const PLATFORM_FEE_PERCENT = 25
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
  const email = cleanOptionalText(value, 320)?.toLowerCase() ?? null

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

  const donationAmount = Math.max(
    0,
    Number(input.donationAmount ?? 0) || 0
  )
  const passPrice = Math.max(
    0,
    Number(campaign.pass_price ?? 0) || 0
  )

  if (passPrice <= 0) {
    return {
      status: 'error',
      message:
        'This fundraiser does not currently have a valid gift-pass price.',
    }
  }

  const admin = createAdminClient()

  const {
    data: selectedOrganization,
    error: organizationError,
  } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', selectedOrganizationId)
    .eq('role', 'organization')
    .maybeSingle()

  if (organizationError || !selectedOrganization) {
    return {
      status: 'error',
      message:
        'Choose a valid organization to receive this support.',
    }
  }

  const platformFee =
    passPrice * (PLATFORM_FEE_PERCENT / 100)
  const organizationEarnings =
    passPrice - platformFee + donationAmount
  const totalAmount =
    passPrice + donationAmount

  const {
    data: purchase,
    error: purchaseError,
  } = await admin
    .from('campaign_purchases')
    .insert({
      campaign_id: campaign.id,
      user_id: user.id,
      buyer_email: user.email ?? null,
      amount_paid: totalAmount,
      platform_fee: platformFee,
      organization_earnings: organizationEarnings,
      selected_organization_id:
        selectedOrganizationId,
      donation_amount: donationAmount,
      seller_name:
        cleanOptionalText(input.sellerName, 120),
      payment_status: 'test_paid',
      is_demo: campaign.is_demo,
      demo_group: campaign.demo_group,
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
      is_demo: campaign.is_demo,
      demo_group: campaign.demo_group,
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
    totalAmount,
  }
}
