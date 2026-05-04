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