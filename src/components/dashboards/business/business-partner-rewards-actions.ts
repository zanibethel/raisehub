'use server'

import { revalidatePath } from 'next/cache'

import { startBusinessStripeOnboarding } from '@/lib/stripe/business-connect'
import { createClient } from '@/lib/supabase/server'

export type RedeemPartnerRewardResult =
  | {
      success: true
      remainingEligiblePoints: number
      endsAt: string | null
    }
  | {
      success: false
      error: string
    }

export type StartBusinessPayoutSetupResult =
  | { success: true; url: string }
  | { success: false; error: string }

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function startBusinessPayoutSetupAction(
  businessId: string
): Promise<StartBusinessPayoutSetupResult> {
  const result = await startBusinessStripeOnboarding(businessId)
  if (!result.ok) return { success: false, error: result.error }
  return { success: true, url: result.url }
}

export async function redeemPartnerRewardAction(
  businessId: string,
  itemCode: string
): Promise<RedeemPartnerRewardResult> {
  const cleanBusinessId = businessId.trim()
  const cleanItemCode = itemCode.trim()

  if (!cleanBusinessId || !cleanItemCode) {
    return { success: false, error: 'Could not identify the selected reward.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to use Partner Points.' }
  }

  const idempotencyKey = crypto.randomUUID()
  const { data, error } = await (supabase as any).rpc('redeem_partner_reward', {
    p_business_id: cleanBusinessId,
    p_item_code: cleanItemCode,
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    const message = error.message?.toLowerCase() ?? ''

    if (message.includes('not enough eligible partner points')) {
      return { success: false, error: 'You do not have enough eligible Partner Points for this reward yet.' }
    }

    if (message.includes('not currently available')) {
      return { success: false, error: 'That Partner Reward is not currently available.' }
    }

    if (message.includes('owner or manager access')) {
      return { success: false, error: 'Only a business owner or manager can redeem Partner Points.' }
    }

    return { success: false, error: 'Could not redeem this reward. Please try again.' }
  }

  const result = Array.isArray(data) ? data[0] : null
  if (!result) {
    return { success: false, error: 'Could not confirm the Partner Reward redemption.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/offers')
  revalidatePath('/dashboard/rewards')

  return {
    success: true,
    remainingEligiblePoints: toNumber(result.remaining_eligible_points),
    endsAt: result.ends_at ?? null,
  }
}
