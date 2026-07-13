import { createClient } from '../supabase/server'
import type { CampaignRow } from '../types/identity-access'

const CAMPAIGN_SELECT_COLUMNS = `
  id,
  organization_id,
  name,
  description,
  goal_amount,
  pass_price,
  starts_at,
  ends_at,
  status,
  created_at
`

type CampaignResult = {
  campaign: CampaignRow | null
  error: string | null
}

export async function getCampaignById(
  campaignId: string
): Promise<CampaignResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_SELECT_COLUMNS)
    .eq('id', campaignId)
    .maybeSingle<CampaignRow>()

  if (error) {
    return { campaign: null, error: error.message }
  }

  return { campaign: data, error: null }
}
