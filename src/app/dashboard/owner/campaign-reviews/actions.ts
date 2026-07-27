'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { evaluateCampaignPublishingEligibility } from '@/lib/campaign-publishing/evaluate'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type ReviewDecision =
  | 'approved'
  | 'changes_requested'
  | 'rejected'
  | 'suspended'

type CampaignRow = {
  id: string
  name: string
  organization_id: string
  canonical_organization_id: string | null
  review_status: string
  status: string
  content_revision: number
  approved_revision: number | null
}

type OrganizationRow = {
  id: string
  name: string | null
  town_name: string | null
  state_code: string | null
}

type StripeAccountRow = {
  livemode: boolean | null
  onboarding_status: string | null
  details_submitted: boolean
  payouts_enabled: boolean
  disabled_reason: string | null
  requirements_currently_due: unknown
}

async function requireOwner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Authentication required.')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') {
    throw new Error('Owner access required.')
  }

  return user
}

function organizationProfileIsReady(organization: OrganizationRow | null) {
  const stateCode = organization?.state_code?.trim().toUpperCase() ?? ''
  return Boolean(
    organization?.name?.trim() &&
      organization.town_name?.trim() &&
      /^[A-Z]{2}$/.test(stateCode)
  )
}

function stripeEnvironmentIsLive() {
  return process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_live_') ?? false
}

async function getApprovalNotificationAction({
  organization,
  campaign,
}: {
  organization: OrganizationRow | null
  campaign: CampaignRow
}) {
  if (!organization) {
    return {
      actionLabel: 'View campaign',
      actionUrl: `/dashboard/campaigns/${campaign.id}/edit`,
      messageSuffix: 'Open the campaign to review the next required step.',
    }
  }

  const admin = createAdminClient() as any
  const { data: stripeAccount } = await admin
    .from('organization_stripe_accounts')
    .select(
      'livemode, onboarding_status, details_submitted, payouts_enabled, disabled_reason, requirements_currently_due'
    )
    .eq('organization_id', organization.id)
    .maybeSingle()

  const stripe = (stripeAccount ?? null) as StripeAccountRow | null
  const eligibility = evaluateCampaignPublishingEligibility({
    campaignId: campaign.id,
    campaignStatus: campaign.status,
    reviewStatus: 'approved',
    authorized: true,
    profileReady: organizationProfileIsReady(organization),
    approvalCurrent: campaign.approved_revision === campaign.content_revision,
    stripe: {
      accountExists: Boolean(stripe),
      expectedLivemode: stripeEnvironmentIsLive(),
      livemode: stripe?.livemode ?? null,
      onboardingStatus: stripe?.onboarding_status ?? null,
      detailsSubmitted: stripe?.details_submitted ?? false,
      payoutsEnabled: stripe?.payouts_enabled ?? false,
      disabledReason: stripe?.disabled_reason ?? null,
      requirementsCurrentlyDue: stripe?.requirements_currently_due ?? [],
    },
  })

  if (eligibility.canPublish) {
    return {
      actionLabel: 'Publish now',
      actionUrl: `/dashboard/campaigns/${campaign.id}/edit`,
      messageSuffix: 'It is ready to publish.',
    }
  }

  return {
    actionLabel: eligibility.nextAction.label,
    actionUrl:
      eligibility.nextAction.href ?? `/dashboard/campaigns/${campaign.id}/edit`,
    messageSuffix:
      eligibility.blockingReasons[0]?.message ??
      'Open the campaign to review the next required step.',
  }
}

async function notifyOrganizationMembers({
  organization,
  campaign,
  decision,
  notes,
  decisionKey,
}: {
  organization: OrganizationRow | null
  campaign: CampaignRow
  decision: ReviewDecision
  notes: string
  decisionKey: string
}) {
  if (!organization) return

  const admin = createAdminClient() as any
  const { data: memberships, error: membershipError } = await admin
    .from('organization_memberships')
    .select('user_id')
    .eq('organization_id', organization.id)
    .eq('status', 'active')

  if (membershipError) {
    console.error('Campaign review notification membership lookup failed', membershipError)
    return
  }

  const userIds = Array.from(
    new Set(
      (memberships ?? [])
        .map((membership: { user_id?: string | null }) => membership.user_id)
        .filter((userId: string | null | undefined): userId is string => Boolean(userId))
    )
  )

  if (userIds.length === 0) return

  const approvalAction =
    decision === 'approved'
      ? await getApprovalNotificationAction({ organization, campaign })
      : null

  const notificationByDecision: Record<
    ReviewDecision,
    {
      severity: 'success' | 'warning' | 'error'
      title: string
      message: string
      actionLabel: string
      actionUrl: string
    }
  > = {
    approved: {
      severity: 'success',
      title: 'Campaign approved',
      message: `“${campaign.name}” was approved. ${approvalAction?.messageSuffix}`,
      actionLabel: approvalAction?.actionLabel ?? 'View campaign',
      actionUrl:
        approvalAction?.actionUrl ?? `/dashboard/campaigns/${campaign.id}/edit`,
    },
    changes_requested: {
      severity: 'warning',
      title: 'Campaign changes requested',
      message: notes
        ? `“${campaign.name}” needs updates before approval: ${notes}`
        : `“${campaign.name}” needs updates before it can be approved.`,
      actionLabel: 'Make changes',
      actionUrl: `/dashboard/campaigns/${campaign.id}/edit`,
    },
    rejected: {
      severity: 'error',
      title: 'Campaign not approved',
      message: notes
        ? `“${campaign.name}” was not approved: ${notes}`
        : `“${campaign.name}” was not approved.`,
      actionLabel: 'View campaign',
      actionUrl: `/dashboard/campaigns/${campaign.id}/edit`,
    },
    suspended: {
      severity: 'warning',
      title: 'Campaign suspended',
      message: notes
        ? `“${campaign.name}” was suspended: ${notes}`
        : `“${campaign.name}” was suspended and paused.`,
      actionLabel: 'View campaign',
      actionUrl: `/dashboard/campaigns/${campaign.id}/edit`,
    },
  }

  const notification = notificationByDecision[decision]
  const rows = userIds.map((userId) => ({
    user_id: userId,
    type: `campaign_review_${decision}`,
    severity: notification.severity,
    title: notification.title,
    message: notification.message,
    action_url: notification.actionUrl,
    action_label: notification.actionLabel,
    source_key: `campaign-review:${campaign.id}:${decision}:${decisionKey}`,
    metadata: {
      campaign_id: campaign.id,
      organization_id: organization.id,
      review_decision: decision,
      decision_key: decisionKey,
    },
  }))

  const { error: notificationError } = await admin.from('notifications').insert(rows)
  if (notificationError) {
    console.error('Campaign review notification insert failed', notificationError)
  }
}

async function saveReviewDecision({
  campaignId,
  decision,
  notes,
  reviewerId,
}: {
  campaignId: string
  decision: ReviewDecision
  notes: string
  reviewerId: string
}) {
  const admin = createAdminClient() as any
  const { data: campaignData, error: campaignError } = await admin
    .from('campaigns')
    .select(
      'id, name, organization_id, canonical_organization_id, review_status, status, content_revision, approved_revision'
    )
    .eq('id', campaignId)
    .maybeSingle()

  if (campaignError || !campaignData) throw new Error('Campaign was not found.')
  const campaign = campaignData as CampaignRow

  const organizationQuery = admin
    .from('organizations')
    .select('id, name, town_name, state_code')

  const { data: organizationData } = campaign.canonical_organization_id
    ? await organizationQuery.eq('id', campaign.canonical_organization_id).maybeSingle()
    : await organizationQuery.eq('legacy_profile_id', campaign.organization_id).maybeSingle()
  const organization = (organizationData ?? null) as OrganizationRow | null

  const reviewedAt = new Date().toISOString()
  const update: Record<string, unknown> = {
    review_status: decision,
    review_notes: notes || null,
    reviewed_at: reviewedAt,
    reviewed_by: reviewerId,
  }

  if (decision === 'suspended') update.status = 'paused'

  const { data: updatedCampaignData, error: updateError } = await admin
    .from('campaigns')
    .update(update)
    .eq('id', campaignId)
    .select(
      'id, name, organization_id, canonical_organization_id, review_status, status, content_revision, approved_revision'
    )
    .maybeSingle()

  if (updateError || !updatedCampaignData) {
    throw new Error('Campaign review could not be saved.')
  }
  const updatedCampaign = updatedCampaignData as CampaignRow

  const { data: auditEvent, error: auditError } = await admin
    .from('campaign_review_events')
    .insert({
      campaign_id: campaignId,
      organization_id: organization?.id ?? null,
      decision_source: 'owner',
      decision,
      previous_review_status: campaign.review_status,
      resulting_review_status: decision,
      risk_level: decision === 'approved' ? 'low' : 'unknown',
      risk_flags: [],
      check_results: {},
      reason: notes || (decision === 'approved' ? 'Approved by RaiseHub Owner.' : null),
      internal_notes: notes || null,
      reviewed_by: reviewerId,
    })
    .select('id')
    .single()

  if (auditError || !auditEvent) {
    console.error('Campaign review audit insert failed', auditError)
    throw new Error('Review changed, but the audit record could not be saved.')
  }

  await notifyOrganizationMembers({
    organization,
    campaign: updatedCampaign,
    decision,
    notes,
    decisionKey: auditEvent.id,
  })
}

function refreshReviewSurfaces() {
  revalidatePath('/dashboard/owner/campaign-reviews')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/notifications')
}

export async function reviewCampaignAction(formData: FormData) {
  const user = await requireOwner()
  const campaignId = String(formData.get('campaignId') ?? '').trim()
  const decision = String(formData.get('decision') ?? '').trim() as ReviewDecision
  const notes = String(formData.get('notes') ?? '').trim()

  if (!campaignId) throw new Error('Campaign is required.')
  if (!['approved', 'changes_requested', 'rejected', 'suspended'].includes(decision)) {
    throw new Error('Invalid review decision.')
  }
  if (decision !== 'approved' && !notes) {
    throw new Error('Add a reason before completing this review.')
  }

  await saveReviewDecision({
    campaignId,
    decision,
    notes,
    reviewerId: user.id,
  })

  refreshReviewSurfaces()
  redirect('/dashboard/owner/campaign-reviews?reviewed=1')
}

export async function bulkApproveCampaignsAction(formData: FormData) {
  const user = await requireOwner()
  const campaignIds = Array.from(
    new Set(
      formData
        .getAll('campaignIds')
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  )

  if (campaignIds.length === 0) {
    redirect('/dashboard/owner/campaign-reviews?select=1')
  }

  for (const campaignId of campaignIds) {
    await saveReviewDecision({
      campaignId,
      decision: 'approved',
      notes: '',
      reviewerId: user.id,
    })
  }

  refreshReviewSurfaces()
  redirect(`/dashboard/owner/campaign-reviews?approved=${campaignIds.length}`)
}
