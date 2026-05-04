'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const PLATFORM_FEE_PERCENT = 25

type PurchaseCampaignInput = {
  campaign_id: string
  pass_price: number
  buyer_email?: string
}

// =========================================
// 💳 SIMULATED PASS PURCHASE
// Stores purchase data in the same shape we’ll use later for Stripe.
// =========================================
export async function purchaseCampaignPassAction(input: PurchaseCampaignInput) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const amountPaid = Number(input.pass_price) || 0
  const platformFee = amountPaid * (PLATFORM_FEE_PERCENT / 100)
  const organizationEarnings = amountPaid - platformFee

  const { error } = await supabase.from('campaign_purchases').insert({
    campaign_id: input.campaign_id,
    user_id: user?.id ?? null,
    buyer_email: input.buyer_email || user?.email || null,
    amount_paid: amountPaid,
    platform_fee: platformFee,
    organization_earnings: organizationEarnings,
    payment_status: 'test_paid',
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')

  return { success: true }
}