'use server'

import { revalidatePath } from 'next/cache'

import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createClient } from '@/lib/supabase/server'

type CreateCampaignInput = {
  name: string
  description: string
  goal_amount: number
  pass_price?: number
  starts_at: string
  ends_at: string
}

type UpdateCampaignInput = {
  campaignId: string
  name: string
  description: string
  goal_amount: number
  pass_price?: number
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

function isCampaignStatus(
  status: string
): status is CampaignStatus {
  return VALID_CAMPAIGN_STATUSES.has(
    status as CampaignStatus
  )
}

function parseCampaignDates({
  startsAt,
  endsAt,
}: {
  startsAt: string
  endsAt: string
}) {
  const startTimestamp = startsAt
    ? new Date(startsAt).getTime()
    : null

  const endTimestamp = endsAt
    ? new Date(endsAt).getTime()
    : null

  if (
    (startTimestamp !== null &&
      Number.isNaN(startTimestamp)) ||
    (endTimestamp !== null &&
      Number.isNaN(endTimestamp))
  ) {
    return {
      error: 'Enter valid campaign dates.',
    }
  }

  if (
    startTimestamp !== null &&
    endTimestamp !== null &&
    endTimestamp < startTimestamp
  ) {
    return {
      error:
        'The end date must be after the start date.',
    }
  }

  return {
    startsAt: startsAt || null,
    endsAt: endsAt || null,
  }
}

export async function createCampaignAction(
  input: CreateCampaignInput
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error:
        'You must be signed in to create a campaign.',
    }
  }

  if (!input.name.trim()) {
    return {
      error: 'Campaign name is required.',
    }
  }

  const goalAmount = Number(input.goal_amount)

  if (
    !Number.isFinite(goalAmount) ||
    goalAmount < 0
  ) {
    return {
      error:
        'Enter a valid fundraising goal.',
    }
  }

  const dates = parseCampaignDates({
    startsAt: input.starts_at,
    endsAt: input.ends_at,
  })

  if ('error' in dates) {
    return dates
  }

  const pricing = await resolveEffectivePricing({
    organizationId: user.id,
  })

  const { error } = await supabase
    .from('campaigns')
    .insert({
      organization_id: user.id,
      name: input.name.trim(),
      description:
        input.description.trim() || null,
      goal_amount: goalAmount,

      // Keep the legacy campaign column synchronized
      // for older reads while managed pricing remains
      // the source of truth.
      pass_price: pricing.passPrice,

      starts_at: dates.startsAt,
      ends_at: dates.endsAt,
      status: 'active',
    })

  if (error) {
    return {
      error:
        'The campaign could not be created. Review the campaign details and try again.',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/campaigns')

  return {
    success: true,
  }
}

export async function updateCampaignAction(
  input: UpdateCampaignInput
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error:
        'You must be signed in to update a campaign.',
    }
  }

  if (!input.name.trim()) {
    return {
      error: 'Campaign name is required.',
    }
  }

  const goalAmount = Number(input.goal_amount)

  if (
    !Number.isFinite(goalAmount) ||
    goalAmount < 0
  ) {
    return {
      error:
        'Enter a valid fundraising goal.',
    }
  }

  const dates = parseCampaignDates({
    startsAt: input.starts_at,
    endsAt: input.ends_at,
  })

  if ('error' in dates) {
    return dates
  }

  const pricing = await resolveEffectivePricing({
    campaignId: input.campaignId,
    organizationId: user.id,
  })

  const { error } = await supabase
    .from('campaigns')
    .update({
      name: input.name.trim(),
      description:
        input.description.trim() || null,
      goal_amount: goalAmount,

      // Organizers cannot set pricing. This legacy
      // value mirrors the current managed rule only.
      pass_price: pricing.passPrice,

      starts_at: dates.startsAt,
      ends_at: dates.endsAt,
    })
    .eq('id', input.campaignId)
    .eq('organization_id', user.id)

  if (error) {
    return {
      error:
        'The campaign could not be updated. Confirm that you manage this campaign and try again.',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/campaigns')
  revalidatePath(
    `/campaigns/${input.campaignId}`
  )

  return {
    success: true,
  }
}

export async function updateCampaignStatusAction(
  campaignId: string,
  status: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error:
        'You must be signed in to update a campaign.',
    }
  }

  if (!isCampaignStatus(status)) {
    return {
      error: 'Invalid campaign status.',
    }
  }

  const { error } = await supabase
    .from('campaigns')
    .update({
      status,
    })
    .eq('id', campaignId)
    .eq('organization_id', user.id)

  if (error) {
    return {
      error:
        'The campaign status could not be updated. Try again.',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/campaigns')
  revalidatePath(`/campaigns/${campaignId}`)

  return {
    success: true,
  }
}