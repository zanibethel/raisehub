'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Action contracts
// =============================================================================

type CampaignActionResult =
  | {
      success: true
      error?: never
    }
  | {
      success?: never
      error: string
    }

type CreateCampaignInput = {
  name: string
  description: string
  goal_amount: number
  starts_at: string
  ends_at: string
}

type UpdateCampaignInput = {
  campaignId: string
  name: string
  description: string
  goal_amount: number
  starts_at: string
  ends_at: string
}

type ParsedCampaignDates =
  | {
      error: string
      startsAt?: never
      endsAt?: never
    }
  | {
      error?: never
      startsAt: string | null
      endsAt: string | null
    }

type CampaignStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'

// =============================================================================
// Validation
// =============================================================================

const VALID_CAMPAIGN_STATUSES =
  new Set<CampaignStatus>([
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
}): ParsedCampaignDates {
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
      error:
        'Enter valid campaign dates.',
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

// =============================================================================
// Cache revalidation
// =============================================================================

function revalidateCampaignPaths(
  campaignId?: string
) {
  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/campaigns')

  if (campaignId) {
    revalidatePath(
      `/campaigns/${campaignId}`
    )
  }
}

// =============================================================================
// Create campaign
// =============================================================================

export async function createCampaignAction(
  input: CreateCampaignInput
): Promise<CampaignActionResult> {
  const supabase =
    await createClient()

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
      error:
        'Campaign name is required.',
    }
  }

  const goalAmount =
    Number(input.goal_amount)

  if (
    !Number.isFinite(goalAmount) ||
    goalAmount < 0
  ) {
    return {
      error:
        'Enter a valid fundraising goal.',
    }
  }

  const dates =
    parseCampaignDates({
      startsAt: input.starts_at,
      endsAt: input.ends_at,
    })

  if (dates.error) {
    return {
      error: dates.error,
    }
  }

  const { error } = await supabase
    .from('campaigns')
    .insert({
      organization_id: user.id,
      name: input.name.trim(),
      description:
        input.description.trim() ||
        null,
      goal_amount: goalAmount,
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

  revalidateCampaignPaths()

  return {
    success: true,
  }
}

// =============================================================================
// Update campaign
// =============================================================================

export async function updateCampaignAction(
  input: UpdateCampaignInput
): Promise<CampaignActionResult> {
  const supabase =
    await createClient()

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
      error:
        'Campaign name is required.',
    }
  }

  const goalAmount =
    Number(input.goal_amount)

  if (
    !Number.isFinite(goalAmount) ||
    goalAmount < 0
  ) {
    return {
      error:
        'Enter a valid fundraising goal.',
    }
  }

  const dates =
    parseCampaignDates({
      startsAt: input.starts_at,
      endsAt: input.ends_at,
    })

  if (dates.error) {
    return {
      error: dates.error,
    }
  }

  const { error } = await supabase
    .from('campaigns')
    .update({
      name: input.name.trim(),
      description:
        input.description.trim() ||
        null,
      goal_amount: goalAmount,
      starts_at: dates.startsAt,
      ends_at: dates.endsAt,
    })
    .eq('id', input.campaignId)
    .eq(
      'organization_id',
      user.id
    )

  if (error) {
    return {
      error:
        'The campaign could not be updated. Confirm that you manage this campaign and try again.',
    }
  }

  revalidateCampaignPaths(
    input.campaignId
  )

  return {
    success: true,
  }
}

// =============================================================================
// Update campaign status
// =============================================================================

export async function updateCampaignStatusAction(
  campaignId: string,
  status: string
): Promise<CampaignActionResult> {
  const supabase =
    await createClient()

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
      error:
        'Invalid campaign status.',
    }
  }

  const { error } = await supabase
    .from('campaigns')
    .update({
      status,
    })
    .eq('id', campaignId)
    .eq(
      'organization_id',
      user.id
    )

  if (error) {
    return {
      error:
        'The campaign status could not be updated. Try again.',
    }
  }

  revalidateCampaignPaths(
    campaignId
  )

  return {
    success: true,
  }
}