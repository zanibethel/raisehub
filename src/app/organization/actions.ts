'use server'

import { revalidatePath } from 'next/cache'

import { evaluateCampaignPublishingEligibility } from '@/lib/campaign-publishing/evaluate'
import { evaluateCampaignRisk } from '@/lib/campaign-review/evaluate'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type CampaignActionResult =
  | { success: true; error?: never }
  | { success?: never; error: string }

type CreateCampaignInput = {
  organizationId: string | null
  name: string
  description: string
  goal_amount: number
  starts_at: string
  ends_at: string
}

type UpdateCampaignInput = Omit<CreateCampaignInput, 'organizationId'> & {
  campaignId: string
}

type ParsedCampaignDates =
  | { error: string; startsAt?: never; endsAt?: never }
  | { error?: never; startsAt: string | null; endsAt: string | null }

type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

type OrganizationRow = {
  id: string
  legacy_profile_id: string | null
  name: string | null
  town_name: string | null
  state_code: string | null
}

type CampaignOwnerRow = {
  id: string
  organization_id: string
  canonical_organization_id: string | null
  review_status?: string
  status?: string
}

type CampaignReviewRow = CampaignOwnerRow & {
  name: string
  description: string | null
  goal_amount: number | null
  starts_at: string | null
  ends_at: string | null
  campaign_type: string
  review_status: string
}

type StripeReadinessRow = {
  livemode?: boolean
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

function parseCampaignDates({ startsAt, endsAt }: { startsAt: string; endsAt: string }): ParsedCampaignDates {
  const startTimestamp = startsAt ? new Date(startsAt).getTime() : null
  const endTimestamp = endsAt ? new Date(endsAt).getTime() : null

  if (
    (startTimestamp !== null && Number.isNaN(startTimestamp)) ||
    (endTimestamp !== null && Number.isNaN(endTimestamp))
  ) {
    return { error: 'Enter valid campaign dates.' }
  }

  if (startTimestamp !== null && endTimestamp !== null && endTimestamp < startTimestamp) {
    return { error: 'The end date must be after the start date.' }
  }

  return { startsAt: startsAt || null, endsAt: endsAt || null }
}

function revalidateCampaignPaths(campaignId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/campaigns')
  if (campaignId) revalidatePath(`/campaigns/${campaignId}`)
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

function stripeEnvironmentIsLive() {
  return process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_live_') ?? false
}

async function getOrganizationById(organizationId: string) {
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('organizations')
    .select('id, legacy_profile_id, name, town_name, state_code')
    .eq('id', organizationId)
    .maybeSingle()
  return (data ?? null) as OrganizationRow | null
}

async function getOrganizationForLegacyProfile(profileId: string) {
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('organizations')
    .select('id, legacy_profile_id, name, town_name, state_code')
    .eq('legacy_profile_id', profileId)
    .maybeSingle()
  return (data ?? null) as OrganizationRow | null
}

async function userCanManageOrganization(userId: string, organization: OrganizationRow) {
  if (organization.legacy_profile_id === userId) return true

  const admin = createAdminClient() as any
  const { data } = await admin
    .from('organization_memberships')
    .select('id')
    .eq('organization_id', organization.id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('membership_role', ['admin', 'manager'])
    .maybeSingle()

  return Boolean(data)
}

async function resolveManagedOrganization(userId: string, requestedOrganizationId: string | null) {
  const organization = requestedOrganizationId
    ? await getOrganizationById(requestedOrganizationId)
    : await getOrganizationForLegacyProfile(userId)

  if (!organization) return null
  return (await userCanManageOrganization(userId, organization)) ? organization : null
}

function organizationSetupIsComplete(organization: OrganizationRow) {
  const stateCode = organization.state_code?.trim().toUpperCase() ?? ''
  return Boolean(
    organization.name?.trim() &&
      organization.town_name?.trim() &&
      /^[A-Z]{2}$/.test(stateCode)
  )
}

async function getAuthorizedCampaign(userId: string, campaignId: string) {
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('campaigns')
    .select('id, organization_id, canonical_organization_id, review_status, status')
    .eq('id', campaignId)
    .maybeSingle()

  const campaign = (data ?? null) as CampaignOwnerRow | null
  if (!campaign) return null

  if (campaign.canonical_organization_id) {
    const organization = await getOrganizationById(campaign.canonical_organization_id)
    if (!organization || !(await userCanManageOrganization(userId, organization))) return null
    return { campaign, organization }
  }

  if (campaign.organization_id !== userId) return null
  const organization = await getOrganizationForLegacyProfile(campaign.organization_id)
  return { campaign, organization }
}

async function getCampaignPublishingEligibility(userId: string, campaignId: string) {
  const authorized = await getAuthorizedCampaign(userId, campaignId)

  if (!authorized) {
    return evaluateCampaignPublishingEligibility({
      campaignId,
      campaignStatus: null,
      reviewStatus: null,
      authorized: false,
      profileReady: false,
      approvalCurrent: true,
      stripe: {
        accountExists: false,
        expectedLivemode: stripeEnvironmentIsLive(),
        livemode: null,
        onboardingStatus: null,
        detailsSubmitted: false,
        payoutsEnabled: false,
        disabledReason: null,
        requirementsCurrentlyDue: [],
      },
    })
  }

  const admin = createAdminClient() as any
  const { data: stripeAccount } = authorized.organization
    ? await admin
        .from('organization_stripe_accounts')
        .select('livemode, onboarding_status, details_submitted, charges_enabled, payouts_enabled, disabled_reason, requirements_currently_due')
        .eq('organization_id', authorized.organization.id)
        .maybeSingle()
    : { data: null }
  const stripe = (stripeAccount ?? null) as StripeReadinessRow | null

  return evaluateCampaignPublishingEligibility({
    campaignId,
    campaignStatus: authorized.campaign.status,
    reviewStatus: authorized.campaign.review_status,
    authorized: true,
    profileReady: Boolean(
      authorized.organization && organizationSetupIsComplete(authorized.organization)
    ),
    approvalCurrent: true,
    stripe: {
      accountExists: Boolean(stripe),
      expectedLivemode: stripeEnvironmentIsLive(),
      livemode: stripe?.livemode ?? null,
      onboardingStatus: stripe?.onboarding_status,
      detailsSubmitted: stripe?.details_submitted ?? false,
      payoutsEnabled: stripe?.payouts_enabled ?? false,
      disabledReason: stripe?.disabled_reason,
      requirementsCurrentlyDue: stripe?.requirements_currently_due ?? [],
    },
  })
}

export async function createCampaignAction(input: CreateCampaignInput): Promise<CampaignActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to create a campaign.' }

  const organization = await resolveManagedOrganization(user.id, input.organizationId)
  if (!organization || !organizationSetupIsComplete(organization)) {
    return { error: 'Complete your organization name, town, and state before creating a campaign.' }
  }

  if (!input.name.trim()) return { error: 'Campaign name is required.' }

  const goalAmount = Number(input.goal_amount)
  if (!Number.isFinite(goalAmount) || goalAmount < 0) {
    return { error: 'Enter a valid fundraising goal.' }
  }

  const dates = parseCampaignDates({ startsAt: input.starts_at, endsAt: input.ends_at })
  if (dates.error) return { error: dates.error }

  const admin = createAdminClient() as any
  const { error } = await admin.from('campaigns').insert({
    organization_id: organization.legacy_profile_id ?? user.id,
    canonical_organization_id: organization.id,
    name: input.name.trim(),
    description: input.description.trim() || null,
    goal_amount: goalAmount,
    starts_at: dates.startsAt,
    ends_at: dates.endsAt,
    status: 'draft',
    review_status: 'not_submitted',
    campaign_type: 'organization',
  })

  if (error) {
    console.error('Campaign creation failed', error)
    return { error: 'The campaign could not be created. Review the campaign details and try again.' }
  }

  revalidateCampaignPaths()
  return { success: true }
}

export async function updateCampaignAction(input: UpdateCampaignInput): Promise<CampaignActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to update a campaign.' }

  if (!(await getAuthorizedCampaign(user.id, input.campaignId))) {
    return { error: 'The campaign could not be updated. Confirm that you manage this campaign and try again.' }
  }

  if (!input.name.trim()) return { error: 'Campaign name is required.' }
  const goalAmount = Number(input.goal_amount)
  if (!Number.isFinite(goalAmount) || goalAmount < 0) return { error: 'Enter a valid fundraising goal.' }

  const dates = parseCampaignDates({ startsAt: input.starts_at, endsAt: input.ends_at })
  if (dates.error) return { error: dates.error }

  const admin = createAdminClient() as any
  const { error } = await admin
    .from('campaigns')
    .update({
      name: input.name.trim(),
      description: input.description.trim() || null,
      goal_amount: goalAmount,
      starts_at: dates.startsAt,
      ends_at: dates.endsAt,
    })
    .eq('id', input.campaignId)

  if (error) return { error: 'The campaign could not be updated. Confirm that you manage this campaign and try again.' }

  revalidateCampaignPaths(input.campaignId)
  return { success: true }
}

export async function submitCampaignForReviewAction(campaignId: string): Promise<CampaignActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to submit a campaign.' }

  const authorized = await getAuthorizedCampaign(user.id, campaignId)
  if (!authorized?.organization || authorized.campaign.status !== 'draft') {
    return { error: 'This draft campaign could not be found.' }
  }

  const admin = createAdminClient() as any
  const [{ data: campaign }, { data: stripeAccount }, approvedCountResult] = await Promise.all([
    admin
      .from('campaigns')
      .select('id, organization_id, canonical_organization_id, name, description, goal_amount, starts_at, ends_at, campaign_type, review_status, status')
      .eq('id', campaignId)
      .eq('status', 'draft')
      .maybeSingle(),
    admin
      .from('organization_stripe_accounts')
      .select('onboarding_status, details_submitted, charges_enabled, payouts_enabled, disabled_reason, requirements_currently_due')
      .eq('organization_id', authorized.organization.id)
      .maybeSingle(),
    admin
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('canonical_organization_id', authorized.organization.id)
      .eq('review_status', 'approved')
      .neq('id', campaignId),
  ])

  if (!campaign) return { error: 'This draft campaign could not be found.' }
  const reviewCampaign = campaign as CampaignReviewRow
  if (reviewCampaign.review_status !== 'not_submitted' && reviewCampaign.review_status !== 'changes_requested') {
    return { error: 'This campaign has already been submitted for review.' }
  }

  const decision = evaluateCampaignRisk({
    name: reviewCampaign.name,
    description: reviewCampaign.description,
    goalAmount: Number(reviewCampaign.goal_amount ?? 0),
    startsAt: reviewCampaign.starts_at,
    endsAt: reviewCampaign.ends_at,
    campaignType: reviewCampaign.campaign_type,
    previousApprovedCampaigns: Number(approvedCountResult.count ?? 0),
    stripeReady: stripeAccountIsReady(stripeAccount as StripeReadinessRow | null),
  })

  const submittedAt = new Date().toISOString()
  const { error: updateError } = await admin
    .from('campaigns')
    .update({
      review_status: decision.resultingReviewStatus,
      review_submitted_at: submittedAt,
      terms_accepted_at: submittedAt,
      reviewed_at: decision.resultingReviewStatus === 'approved' ? submittedAt : null,
      reviewed_by: null,
      review_notes: null,
    })
    .eq('id', campaignId)
    .eq('status', 'draft')

  if (updateError) return { error: 'The campaign could not be submitted for review.' }

  const { error: eventError } = await admin.from('campaign_review_events').insert({
    campaign_id: campaignId,
    organization_id: authorized.organization.id,
    decision_source: 'automation',
    decision: decision.decision,
    previous_review_status: reviewCampaign.review_status,
    resulting_review_status: decision.resultingReviewStatus,
    risk_level: decision.riskLevel,
    risk_flags: decision.riskFlags,
    check_results: decision.checkResults,
    reason: decision.reason,
    reviewed_by: null,
  })

  if (eventError) {
    console.error('Campaign review audit event could not be recorded', eventError)
    return { error: 'The campaign review result could not be audited. Please submit it again.' }
  }

  revalidateCampaignPaths(campaignId)
  return { success: true }
}

export async function updateCampaignStatusAction(campaignId: string, status: string): Promise<CampaignActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to update a campaign.' }
  if (!isCampaignStatus(status)) return { error: 'Invalid campaign status.' }

  const authorized = await getAuthorizedCampaign(user.id, campaignId)
  if (!authorized) {
    return { error: 'The campaign status could not be updated. Try again.' }
  }

  const currentStatus = authorized.campaign.status?.trim().toLowerCase()
  const admin = createAdminClient() as any

  if (status === 'active' && currentStatus === 'draft') {
    const eligibility = await getCampaignPublishingEligibility(user.id, campaignId)
    if (!eligibility.canPublish) {
      return {
        error:
          eligibility.blockingReasons[0]?.message ??
          'This campaign is not eligible to publish yet.',
      }
    }

    const { data: publishedCampaign, error } = await admin
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaignId)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle()

    if (error || !publishedCampaign) {
      return { error: 'The campaign changed before it could be published. Refresh and try again.' }
    }

    revalidateCampaignPaths(campaignId)
    return { success: true }
  }

  if (status === 'active' && currentStatus !== 'paused' && currentStatus !== 'active') {
    return { error: 'Only a paused campaign can be resumed.' }
  }

  const { error } = await admin
    .from('campaigns')
    .update({ status })
    .eq('id', campaignId)

  if (error) return { error: 'The campaign status could not be updated. Try again.' }

  revalidateCampaignPaths(campaignId)
  return { success: true }
}
