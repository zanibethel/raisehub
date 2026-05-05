'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const PLATFORM_FEE_PERCENT = 25

type PurchaseCampaignInput = {
  campaign_id: string
  pass_price: number
  selected_organization_id?: string
  donation_amount?: number
}

// =========================================
// 💳 SIMULATED PASS PURCHASE
// Pass price gets platform fee.
// Donation goes fully to selected organization.
// Later, Stripe can replace the simulated payment step
// while keeping this same purchase table structure.
// =========================================
export async function purchaseCampaignPassAction(input: PurchaseCampaignInput) {
  const supabase = await createClient()

  // =========================================
  // 🔐 AUTH CHECK
  // Optional user tracking. Public supporters can still purchase.
  // =========================================
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // =========================================
  // 🧮 PURCHASE CALCULATION
  // =========================================
  const passPrice = Number(input.pass_price) || 0
  const donationAmount = Number(input.donation_amount ?? 0) || 0

  const platformFee = passPrice * (PLATFORM_FEE_PERCENT / 100)
  const passOrganizationEarnings = passPrice - platformFee
  const organizationEarnings = passOrganizationEarnings + donationAmount
  const amountPaid = passPrice + donationAmount

  // =========================================
  // 💾 SAVE PURCHASE
  // =========================================
  const { error } = await supabase.from('campaign_purchases').insert({
    campaign_id: input.campaign_id,
    user_id: user?.id ?? null,
    buyer_email: user?.email ?? null,
    amount_paid: amountPaid,
    platform_fee: platformFee,
    organization_earnings: organizationEarnings,
    selected_organization_id: input.selected_organization_id ?? null,
    donation_amount: donationAmount,
    payment_status: 'test_paid',
  })

  if (error) {
    return { error: error.message }
  }

  // =========================================
  // ♻️ REVALIDATE UPDATED PAGES
  // Keeps dashboard, campaign page, campaign list,
  // and homepage carousel progress fresh.
  // =========================================
  revalidatePath('/dashboard')
  revalidatePath(`/campaigns/${input.campaign_id}`)
  revalidatePath('/campaigns')
  revalidatePath('/')

  return { success: true }
}