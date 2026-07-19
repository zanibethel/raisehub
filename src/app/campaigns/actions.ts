'use server'

import { revalidatePath } from 'next/cache'
import { getCampaignById } from '@/lib/repositories/campaign-repository'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import { resolveCampaignRecovery } from '@/lib/services/campaign-recovery-service'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { getOrganizationPricingLocation } from '@/lib/services/organization-pricing-location-service'
import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type {
  CampaignRecoveryResult,
  SellableCampaignOption,
} from '@/lib/types/campaigns'

type PurchaseCampaignInput = {
  campaign_id: string
  selected_organization_id?: string
  donation_amount?: number
  seller_name?: string
}

type PurchaseCampaignPassActionResult =
  | {
      status: 'success'
    }
  | {
      status: 'replacement-found'
      campaignId: string
      replacedCampaignId: string
    }
  | {
      status: 'selection-required'
      replacedCampaignId: string
      campaigns: SellableCampaignOption[]
    }
  | {
      status: 'no-valid-campaign'
      replacedCampaignId: string | null
    }
  | {
      status: 'error'
      message: string
    }

function mapRecoveryResult(
  recoveryResult: CampaignRecoveryResult
): PurchaseCampaignPassActionResult {
  switch (recoveryResult.status) {
    case 'replacement-found':
      return recoveryResult

    case 'selection-required':
      return recoveryResult

    case 'no-valid-campaign':
      return recoveryResult

    case 'lookup-failure':
      return {
        status: 'error',
        message:
          'We could not refresh campaign availability. Please try again.',
      }

    case 'current-campaign-valid':
      return {
        status: 'error',
        message:
          'We could not complete the purchase. Please try again.',
      }
  }
}

function normalizeDonationAmount(value: number | undefined) {
  const normalized = Number(value ?? 0)

  if (!Number.isFinite(normalized)) {
    return 0
  }

  return Math.round(Math.max(0, normalized) * 100) / 100
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

export async function purchaseCampaignPassAction(
  input: PurchaseCampaignInput
): Promise<PurchaseCampaignPassActionResult> {
  const supabase = await createClient()
  const now = new Date()

  const { campaign, error: campaignError } =
    await getCampaignById(input.campaign_id)

  if (campaignError) {
    return {
      status: 'error',
      message:
        'We could not confirm the selected campaign. Please try again.',
    }
  }

  if (!campaign) {
    return mapRecoveryResult(
      await resolveCampaignRecovery(
        input.campaign_id,
        now
      )
    )
  }

  if (!isCampaignCurrentlySellable(campaign, now)) {
    return mapRecoveryResult(
      await resolveCampaignRecovery(
        input.campaign_id,
        now
      )
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message:
        'Create an account or log in before purchasing a fundraiser pass.',
    }
  }

  const passAccess = await getCustomerPassAccess(
    user.id,
    now
  )

  if (passAccess.error) {
    return {
      status: 'error',
      message:
        'We could not confirm your current pass access. Please try again.',
    }
  }

  const donationAmount = normalizeDonationAmount(
    input.donation_amount
  )

  const isDonationOnly = passAccess.hasActivePass

  if (isDonationOnly && donationAmount <= 0) {
    return {
      status: 'error',
      message:
        'Choose a donation amount to support this fundraiser.',
    }
  }

  const admin = createAdminClient()

  const selectedOrganizationId =
    input.selected_organization_id?.trim() ||
    campaign.organization_id

  const {
    data: selectedOrganization,
    error: selectedOrganizationError,
  } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', selectedOrganizationId)
    .eq('role', 'organization')
    .maybeSingle()

  if (
    selectedOrganizationError ||
    !selectedOrganization
  ) {
    return {
      status: 'error',
      message:
        'Choose a valid organization to receive this support.',
    }
  }

  const [
    {
      data: campaignOrganization,
      error: campaignOrganizationError,
    },
    {
      data: campaignOrganizationProfile,
      error: campaignOrganizationProfileError,
    },
  ] = await Promise.all([
    admin
      .from('organizations')
      .select('id')
      .eq(
        'legacy_profile_id',
        campaign.organization_id
      )
      .maybeSingle(),
    admin
      .from('profiles')
      .select('is_demo, demo_group')
      .eq('id', campaign.organization_id)
      .maybeSingle(),
  ])

  if (
    campaignOrganizationError ||
    campaignOrganizationProfileError ||
    !campaignOrganizationProfile
  ) {
    return {
      status: 'error',
      message:
        'We could not confirm campaign pricing. Please try again.',
    }
  }

  const organizationPricingLocation =
    isDonationOnly
      ? null
      : await getOrganizationPricingLocation(
          campaignOrganization?.id ?? null
        )

  const effectivePricing = isDonationOnly
    ? null
    : await resolveEffectivePricing({
        campaignId: campaign.id,
        organizationId:
          campaignOrganization?.id ?? null,
        townName:
          organizationPricingLocation?.townName ??
          null,
        stateCode:
          organizationPricingLocation?.stateCode ??
          null,
        donationAmount,
        isDemo:
          campaignOrganizationProfile.is_demo,
        now,
      })

  if (
    !isDonationOnly &&
    (!effectivePricing ||
      effectivePricing.passPrice <= 0)
  ) {
    return {
      status: 'error',
      message:
        'This fundraiser does not currently have valid pass pricing.',
    }
  }

  const amountPaid = isDonationOnly
    ? donationAmount
    : effectivePricing!.totalAmount

  const platformFee = isDonationOnly
    ? 0
    : effectivePricing!.platformFeeAmount

  const organizationEarnings = isDonationOnly
    ? donationAmount
    : effectivePricing!.organizationTotalEarnings

  const {
    data: purchaseResult,
    error: purchaseError,
  } = await admin.rpc(
    'create_campaign_purchase_with_entitlement',
    {
      p_campaign_id: campaign.id,
      p_user_id: user.id,
      p_buyer_email: user.email ?? null,
      p_selected_organization_id:
        selectedOrganizationId,
      p_donation_amount: donationAmount,
      p_seller_name: cleanOptionalText(
        input.seller_name,
        120
      ),
      p_amount_paid: amountPaid,
      p_platform_fee: platformFee,
      p_organization_earnings:
        organizationEarnings,
      p_is_demo:
        campaignOrganizationProfile.is_demo,
      p_demo_group:
        campaignOrganizationProfile.demo_group,
      p_grant_entitlement: !isDonationOnly,
      p_pricing_rule_id:
        effectivePricing?.pricingRuleId ?? null,
      p_pricing_scope:
        effectivePricing?.pricingScope ?? null,
      p_pass_price_charged:
        effectivePricing?.passPrice ?? null,
      p_platform_fee_percent:
        effectivePricing?.platformFeePercent ??
        null,
      p_organization_pass_earnings:
        effectivePricing
          ?.organizationPassEarnings ?? null,
      p_pricing_resolved_at:
        effectivePricing
          ? now.toISOString()
          : null,
    }
  )

  const createdRecord = purchaseResult?.[0]

  const missingExpectedEntitlement =
    !isDonationOnly &&
    !createdRecord?.entitlement_id

  const unexpectedDonationEntitlement =
    isDonationOnly &&
    Boolean(createdRecord?.entitlement_id)

  if (
    purchaseError ||
    !createdRecord?.purchase_id ||
    missingExpectedEntitlement ||
    unexpectedDonationEntitlement
  ) {
    const recoveryResult =
      await resolveCampaignRecovery(
        input.campaign_id,
        new Date()
      )

    if (
      recoveryResult.status !==
      'current-campaign-valid'
    ) {
      return mapRecoveryResult(recoveryResult)
    }

    return {
      status: 'error',
      message:
        'We could not record your support and pass access. Please try again.',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath(
    `/campaigns/${input.campaign_id}`
  )
  revalidatePath('/campaigns')
  revalidatePath('/offers')
  revalidatePath('/saved-offers')
  revalidatePath('/')

  return { status: 'success' }
}