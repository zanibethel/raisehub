'use server'

import { updateCampaignStatusAction } from '@/app/organization/actions'

// =========================================
// 🗄️ ARCHIVE CAMPAIGN
// Hides campaign without deleting history.
// =========================================
export async function archiveCampaignAction(campaignId: string) {
  return updateCampaignStatusAction(campaignId, 'archived')
}