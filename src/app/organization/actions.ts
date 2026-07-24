'use server'

import { revalidatePath } from 'next/cache'

import { evaluateCampaignRisk } from '@/lib/campaign-review/evaluate'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type CampaignActionResult =
  | { success: true; error?: never }
  | { success?: never; error: string }

type CreateCampaignInput = {
  name: string
  description: string
  goal_amount: number
  starts_at: string
  ends_at: string
}

type UpdateCampaignInput = CreateCampaignInput & {
  campaignId: string
}

type ParsedCampaignDates =
  | { error: string; startsAt?: never; endsAt?: never }
  | { error?: never; startsAt: string | null; endsAt: string | null }

type CampaignStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'

type OrganizationReadinessRow = {
  id?: string
  name?: string | null
  town_name?: string | null
  state_code?: string | null
}

type CampaignPublishRow = {
  id: string
  review_status: string
}

type CampaignReviewRow = {
  id: string
  name: string
  description: string | null
  goal_amount: number | null
  starts_at: string | null
  ends_at: string | null
  campaign_type: string
  review_status: string
}

type StripeReadinessRow = {
  onboarding_status: string
  details_submitted: boolean
  charges_enabled?: boolean
  payouts_enabled: boolean
  disabled_reason?: string | null
  requirements_currently_due?: unknown
}

const VALID_CAMPAIGN_STATUSES = new Set<CampaignStatus>([
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
])

function isCampaignStatus(status: string): status is CampaignStatus {
  return VALID_CAMPAIGN_STATUSES.has(status as CampaignStatus)
}

function parseCampaignDates({
  startsAt,
  endsAt,
}: {
  startsAt: string
  endsAt: string
}): ParsedCampaignDates {
  const startTimestamp = startsAt ? new Date(startsAt).getTime() : null
  const endTimestamp = endsAt ? new Date(endsAt).getTime() : null

  if (
    (startTimestamp !== null && Number.isNaN(startTimestamp)) ||
    (endTimestamp !== null && Number.isNaN(endTimestamp))
  ) {
    return { error: 'Enter valid campaign dates.' }
  }

  if (
    startTimestamp !== null &&
    endTimestamp !== null &&
    endTimestamp < startTimestamp
  ) {
    return { error: 'The end date must be after the start date.' }
  }

  return {
    startsAt: startsAt || null,
    endsAt: endsAt || null,
  }
}

function revalidateCampaignPaths(campaignId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/campaigns')

  if (campaignId) {
    revalidatePath(`/campaigns/${campaignId}`)
  }
}

function hasOutstandingRequirements(value: unknown) {
  return Array.isArray(value) && value.length > 0
}

function stripeAccountIsReady(account: StripeReadinessRow | null) {
  return Boolean(
    account &&
      account.onboarding_status === 'enabled' &&
      account.details_submitted &&
      account.payouts_enabled &&
      !account.disabled_reason &&
      !hasOutstandingRequirements(account.requirements_currently_due)
  )
}

async function getOrganizationForLegacyProfile(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('organizations')
    .select('*')
    .eq('legacy_profile_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data as OrganizationReadinessRow
}

async function organizationSetupIsComplete(userId: string) {
  const organization = await getOrganizationForLegacyProfile(userId)
  if (!organization) return false

  const stateCode = organization.state_code?.trim().toUpperCase() ?? ''

  return Boolean(
    organization.name?.trim() &&
      organization.town_name?.trim() &&
      /^[A-Z]{2}$/.test(stateCode)
  )
}

async function campaignCanPublish(userId: string, campaignId: string) {
  const admin = createAdminClient()
  const organization = await getOrganizationForLegacyProfile(userId)

  if (!organization?.id) {
    return {
      allowed: false,
      error: 'Complete your Organization workspace before publishing a campaign.',
    }
  }

  const [{ data: campaign }, { data: stripeAccount }] = await Promise.all([
    admin
      .from('campaigns')
      .select('id, review_status')
      .eq('id', campaignId)
      .eq('organization_id', userId)
      .maybeSingle<CampaignPublishRow>(),
    (admin as any)
      .from('organization_stripe_accounts')
      .select(
        'onboarding_status, details_submitted, charges_enabled, payouts_enabled, disabled_reason, requirements_currently_due'
      )
      .eq('organization_id', organization.id)
      .maybeSingle(),
  ])

  if (!campaign) {
    return { allowed: false, error: 'Campaign could not be found.' }
  }

  if (campaign.review_status !== 'approved') {
    return {
      allowed: false,
      error: 'RaiseHub must approve this campaign before it can be published.',
    }
  }

  if (!stripeAccountIsReady(stripeAccount as StripeReadinessRow | null)) {
    return {
      allowed: false,
      error: 'Complete Stripe payout verification before publishing this campaign.',
    }
  }

  return { allowed: true as const }
}

export async function createCampaignAction(
  input: CreateCampaignInput
): Promise<CampaignActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to create a campaign.' }
  }

  if (!(await organizationSetupIsComplete(user.id))) {
    return {
      error:
        'Complete your organization name, town, and state before creating a campaign.',
    }
  }

  if (!input.name.trim()) {
    return { error: 'Campaign name is required.' }
  }

  const goalAmount = Number(input.goal_amount)

  if (!Number.isFinite(goalAmount) || goalAmount < 0) {
    return { error: 'Enter a valid fundraising goal.' }
  }

  const dates = parseCampaignDates({
    startsAt: input.starts_at,
    endsAt: input.ends_at,
  })

  if (dates.error) return { error: dates.error }

  const { error } = await supabase.from('campaigns').insert({
    organization_id: user.id,
    name: input.name.trim(),
    description: input.description.trim() || null,
    goal_amount: goalAmount,
    starts_at: dates.startsAt,
    ends_at: dates.endsAt,
    status: 'draft',
    review_status: 'not_submitted',
    campaign_type: 'organization',
  } as never)

  if (error) {
    return {
      error:
        'The campaign could not be created. Review the campaign details and try again.',
    }
  }

  revalidateCampaignPaths()
  return { success: true }
}

export async function updateCampaignAction(
  input: UpdateCampaignInput
): Promise<CampaignActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to update a campaign.' }
  }

  if (!input.name.trim()) {
    return { error: 'Campaign name is required.' }
  }

  const goalAmount = Number(input.goal_amount)

  if (!Number.isFinite(goalAmount) || goalAmount < 0) {
    return { error: 'Enter a valid fundraising goal.' }
  }

  const dates = parseCampaignDates({
    startsAt: input.starts_at,
    endsAt: input.ends_at,
  })

  if (dates.error) return { error: dates.error }

  const { error } = await supabase
    .from('campaigns')
    .update({
      name: input.name.trim(),
      description: input.description.trim() || null,
      goal_amount: goalAmount,
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

  revalidateCampaignPaths(input.campaignId)
  return { success: true }
}

export async function submitCampaignForReviewAction(
  campaignId: string
): Promise<CampaignActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to submit a campaign.' }
  }

  const admin = createAdminClient() as any
  const organization = await getOrganizationForLegacyProfile(user.id)

  if (!organization?.id) {
    return { error: 'Complete your Organization workspace before submitting.' }
  }

  const [{ data: campaign }, { data: stripeAccount }, approvedCountResult] =
    await Promise.all([
      admin
        .from('campaigns')
        .select(
          'id, name, description, goal_amount, starts_at, ends_at, campaign_type, review_status'
        )
        .eq('id', campaignId)
        .eq('organization_id', user.id)
        .eq('status', 'draft')
        .maybeSingle(),
      admin
        .from('organization_stripe_accounts')
        .select(
          'onboarding_status, details_submitted, charges_enabled, payouts_enabled, disabled_reason, requirements_currently_due'
        )
        .eq('organization_id', organization.id)
        .maybeSingle(),
      admin
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', user.id)
        .eq('review_status', 'approved')
        .neq('id', campaignId),
    ])

  if (!campaign) {
    return { error: 'This draft campaign could not be found.' }
  }

  if (campaign.review_status !== 'not_submitted' && campaign.review_status !== 'changes_requested') {
    return { error: 'This campaign has already been submitted for review.' }
  }

  const decision = evaluateCampaignRisk({
    name: (campaign as CampaignReviewRow).name,
    description: (campaign as CampaignReviewRow).description,
    goalAmount: Number((campaign as CampaignReviewRow).goal_amount ?? 0),
    startsAt: (campaign as CampaignReviewRow).starts_at,
    endsAt: (campaign as CampaignReviewRow).ends_at,
    campaignType: (campaign as CampaignReviewRow).campaign_type,
    previousApprovedCampaigns: Number(approvedCountResult.count ?? 0),
    stripeReady: stripeAccountIsReady(
      stripeAccount as StripeReadinessRow | null
    ),
  })

  const submittedAt = new Date().toISOString()
  const { error: updateError } = await admin
    .from('campaigns')
    .update({
      review_status: decision.resultingReviewStatus,
      review_submitted_at: submittedAt,
      terms_accepted_at: submittedAt,
      reviewed_at:
        decision.resultingReviewStatus === 'approved' ? submittedAt : null,
      reviewed_by: null,
      review_notes: null,
    })
    .eq('id', campaignId)
    .eq('organization_id', user.id)
    .eq('status', 'draft')

  if (updateError) {
    return { error: 'The campaign could not be submitted for review.' }
  }

  const { error: eventError } = await admin
    .from('campaign_review_events')
    .insert({
      campaign_id: campaignId,
      organization_id: organization.id,
      decision_source: 'automation',
      decision: decision.decision,
      previous_review_status: (campaign as CampaignReviewRow).review_status,
      resulting_review_status: decision.resultingReviewStatus,
      risk_level: decision.riskLevel,
      risk_flags: decision.riskFlags,
      check_results: decision.checkResults,
      reason: decision.reason,
      reviewed_by: null,
    })

  if (eventError) {
    console.error('Campaign review audit event could not be recorded', eventError)
    return {
      error:
        'The campaign review result could not be audited. Please submit it again.',
    }
  }

  revalidateCampaignPaths(campaignId)
  return { success: true }
}

export async function updateCampaignStatusAction(
  campaignId: string,
  status: string
): Promise<CampaignActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to update a campaign.' }
  }

  if (!isCampaignStatus(status)) {
    return { error: 'Invalid campaign status.' }
  }

  if (status === 'active') {
    const readiness = await campaignCanPublish(user.id, campaignId)
    if (!readiness.allowed) return { error: readiness.error }
  }

  const { error } = await supabase
    .from('campaigns')
    .update({ status })
    .eq('id', campaignId)
    .eq('organization_id', user.id)

  if (error) {
    return { error: 'The campaign status could not be updated. Try again.' }
  }

  revalidateCampaignPaths(campaignId)
  return { success: true }
}
