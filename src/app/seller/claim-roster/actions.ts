'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type ClaimableRosterEntry = {
  organization_id: string
  organization_name: string
  campaign_id: string
  campaign_name: string
  campaign_seller_id: string
  display_name: string
  referral_code: string
}

export async function listClaimableRosterEntriesAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: 'Sign in to link your seller profile.' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('list_claimable_campaign_sellers', {
    p_actor_profile_id: user.id,
  })

  if (error) {
    return { success: false as const, error: error.message }
  }

  return { success: true as const, data: (data ?? []) as ClaimableRosterEntry[] }
}

export async function claimRosterEntryAction(campaignSellerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: 'Sign in to link your seller profile.' }
  }

  const { error } = await supabase.rpc('claim_campaign_seller_roster_entry', {
    p_actor_profile_id: user.id,
    p_campaign_seller_id: campaignSellerId,
  })

  if (error) {
    return { success: false as const, error: error.message }
  }

  revalidatePath('/seller/claim-roster')
  revalidatePath('/dashboard')
  return { success: true as const }
}
