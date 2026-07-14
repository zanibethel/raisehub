'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import { getCampaignById } from '@/lib/repositories/campaign-repository'
import { resolveCampaignRecovery } from '@/lib/services/campaign-recovery-service'
import type {
  CampaignRecoveryResult,
  SellableCampaignOption,
} from '@/lib/types/campaigns'

const PLATFORM_FEE_PERCENT = 25

type PurchaseCampaignInput = {
  campaign_id: string
  pass_price: number
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
        message: 'We could not refresh campaign availability. Please try again.',
      }
    case 'current-campaign-valid':
      return {
        status: 'error',
        message: 'We could not complete the purchase. Please try again.',
      }
  }
}

export async function purchaseCampaignPassAction(
  input: PurchaseCampaignInput
): Promise<PurchaseCampaignPassActionResult> {
  const supabase = await createClient()
  const now = new Date()

  const { campaign, error: campaignError } = await getCampaignById(
    input.campaign_id
  )

  if (campaignError) {
    return {
      status: 'error',
      message: 'We could not confirm the selected campaign. Please try again.',
    }
  }

  if (!campaign) {
    return {
      status: 'no-valid-campaign',
      replacedCampaignId: null,
    }
  }

  if (!isCampaignCurrentlySellable(campaign, now)) {
    return mapRecoveryResult(
      await resolveCampaignRecovery(input.campaign_id, now)
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const passPrice = Number(input.pass_price) || 0
  const donationAmount = Number(input.donation_amount ?? 0) || 0

  const platformFee = passPrice * (PLATFORM_FEE_PERCENT / 100)
  const passOrganizationEarnings = passPrice - platformFee
  const organizationEarnings = passOrganizationEarnings + donationAmount
  const amountPaid = passPrice + donationAmount

  const { error } = await supabase.from('campaign_purchases').insert({
    campaign_id: input.campaign_id,
    user_id: user?.id ?? null,
    buyer_email: user?.email ?? null,
    amount_paid: amountPaid,
    platform_fee: platformFee,
    organization_earnings: organizationEarnings,
    selected_organization_id: input.selected_organization_id ?? null,
    donation_amount: donationAmount,
    seller_name: input.seller_name ?? null,
    payment_status: 'test_paid',
  })

  if (error) {
    return mapRecoveryResult(
      await resolveCampaignRecovery(input.campaign_id, new Date())
    )
  }

  revalidatePath('/dashboard')
  revalidatePath(`/campaigns/${input.campaign_id}`)
  revalidatePath('/campaigns')
  revalidatePath('/')

  return { status: 'success' }
}
