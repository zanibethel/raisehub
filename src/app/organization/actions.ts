'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type CreateCampaignInput = {
  name: string
  description: string
  goal_amount: number
  pass_price: number
  starts_at: string
  ends_at: string
}

type UpdateCampaignInput = {
  campaignId: string
  name: string
  description: string
  goal_amount: number
  pass_price: number
  starts_at: string
  ends_at: string
}

type CampaignStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'

const VALID_CAMPAIGN_STATUSES = new Set<CampaignStatus>([
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
])

export async function createCampaignAction(input: CreateCampaignInput) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('campaigns').insert({
    organization_id: user.id,
    name: input.name,
    description: input.description,
    goal_amount: input.goal_amount,
    pass_price: input.pass_price,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    status: 'active',
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateCampaignAction(input: UpdateCampaignInput) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  if (!input.name.trim()) {
    return { error: 'Campaign name is required.' }
  }

  if (
    input.starts_at &&
    input.ends_at &&
    input.ends_at < input.starts_at
  ) {
    return {
      error: 'The end date must be after the start date.',
    }
  }

  const { error } = await supabase
    .from('campaigns')
    .update({
      name: input.name.trim(),
      description: input.description.trim() || null,
      goal_amount: input.goal_amount,
      pass_price: input.pass_price,
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
    })
    .eq('id', input.campaignId)
    .eq('organization_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/campaigns')
  revalidatePath(`/campaigns/${input.campaignId}`)

  return { success: true }
}

export async function updateCampaignStatusAction(
  campaignId: string,
  status: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  if (!VALID_CAMPAIGN_STATUSES.has(status as CampaignStatus)) {
    return { error: 'Invalid campaign status.' }
  }

  const { error } = await supabase
    .from('campaigns')
    .update({
      status: status as CampaignStatus,
    })
    .eq('id', campaignId)
    .eq('organization_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/campaigns')
  revalidatePath(`/campaigns/${campaignId}`)

  return { success: true }
}