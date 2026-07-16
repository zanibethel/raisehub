'use server'

import { revalidatePath } from 'next/cache'
import { getCampaignById } from '@/lib/repositories/campaign-repository'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import { resolveCampaignRecovery } from '@/lib/services/campaign-recovery-service'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type {
  CampaignRecoveryResult,
  SellableCampaignOption,
} from '@/lib/types/campaigns'

type PurchaseCampaignInput = {
  campaign_id: string

  // Transitional compatibility only. The server never trusts or uses this
  // browser-supplied value. It can be removed after the client stops sending it.
  pass_price?: number

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

  return Math.max(0, normalized)
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
      .select('is_demo')
      .eq('id', campaign.organization_id)
      .maybeSingle(),
  ])

  if (
    campaignOrganizationError ||
    campaignOrganizationProfileError
  ) {
    return {
      status: 'error',
      message:
        'We could not confirm campaign pricing. Please try again.',
    }
  }

  const effectivePricing = isDonationOnly
    ? null
    : await resolveEffectivePricing({
        campaignId: campaign.id,
        organizationId:
          campaignOrganization?.id ?? null,
        donationAmount,
        isDemo:
          campaignOrganizationProfile?.is_demo ??
          false,
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

  const purchaseValues = isDonationOnly
    ? {
        campaign_id: campaign.id,
        user_id: user.id,
        buyer_email: user.email ?? null,
        amount_paid: donationAmount,
        platform_fee: 0,
        organization_earnings: donationAmount,
        selected_organization_id:
          selectedOrganizationId,
        donation_amount: donationAmount,
        seller_name: cleanOptionalText(
          input.seller_name,
          120
        ),
        payment_status: 'test_paid',
      }
    : {
        campaign_id: campaign.id,
        user_id: user.id,
        buyer_email: user.email ?? null,
        amount_paid: effectivePricing!.totalAmount,
        platform_fee:
          effectivePricing!.platformFeeAmount,
        organization_earnings:
          effectivePricing!
            .organizationTotalEarnings,
        selected_organization_id:
          selectedOrganizationId,
        donation_amount:
          effectivePricing!.donationAmount,
        seller_name: cleanOptionalText(
          input.seller_name,
          120
        ),
        payment_status: 'test_paid',
        pricing_rule_id:
          effectivePricing!.pricingRuleId,
        pricing_scope:
          effectivePricing!.pricingScope,
        pass_price_charged:
          effectivePricing!.passPrice,
        platform_fee_percent:
          effectivePricing!
            .platformFeePercent,
        organization_pass_earnings:
          effectivePricing!
            .organizationPassEarnings,
        pricing_resolved_at: now.toISOString(),
      }

  const { error: purchaseError } = await admin
    .from('campaign_purchases')
    .insert(purchaseValues)

  if (purchaseError) {
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
        'We could not record your support. Please try again.',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath(
    `/campaigns/${input.campaign_id}`
  )
  revalidatePath('/campaigns')
  revalidatePath('/')

  return { status: 'success' }
}
