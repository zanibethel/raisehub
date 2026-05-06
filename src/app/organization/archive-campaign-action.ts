'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// =========================================
// 🗄️ ARCHIVE CAMPAIGN
// Hides campaign without deleting history.
// =========================================
export async function archiveCampaignAction(campaignId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'archived' })
    .eq('id', campaignId)
    .eq('organization_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/campaigns')
  revalidatePath(`/campaigns/${campaignId}`)

  return { success: true }
}