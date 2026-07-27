'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type ReviewDecision =
  | 'approved'
  | 'changes_requested'
  | 'rejected'
  | 'suspended'

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

async function notifyOrganizationMembers({
  organizationId,
  campaignId,
  campaignName,
  decision,
  notes,
}: {
  organizationId: string | null
  campaignId: string
  campaignName: string
  decision: ReviewDecision
  notes: string
}) {
  if (!organizationId) return

  const admin = createAdminClient() as any
  const { data: memberships, error: membershipError } = await admin
    .from('organization_memberships')
    .select('user_id')
    .eq('organization_id', organizationId)
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

  const notificationByDecision: Record<
    ReviewDecision,
    { severity: 'success' | 'warning' | 'error'; title: string; message: string; actionLabel: string }
  > = {
    approved: {
      severity: 'success',
      title: 'Campaign approved',
      message: `“${campaignName}” was approved. Review any remaining publishing requirements, then publish when ready.`,
      actionLabel: 'View campaign',
    },
    changes_requested: {
      severity: 'warning',
      title: 'Campaign changes requested',
      message: notes
        ? `“${campaignName}” needs updates before approval: ${notes}`
        : `“${campaignName}” needs updates before it can be approved.`,
      actionLabel: 'Make changes',
    },
    rejected: {
      severity: 'error',
      title: 'Campaign not approved',
      message: notes
        ? `“${campaignName}” was not approved: ${notes}`
        : `“${campaignName}” was not approved.`,
      actionLabel: 'View campaign',
    },
    suspended: {
      severity: 'warning',
      title: 'Campaign suspended',
      message: notes
        ? `“${campaignName}” was suspended: ${notes}`
        : `“${campaignName}” was suspended and paused.`,
      actionLabel: 'View campaign',
    },
  }

  const notification = notificationByDecision[decision]
  const rows = userIds.map((userId) => ({
    user_id: userId,
    type: `campaign_review_${decision}`,
    severity: notification.severity,
    title: notification.title,
    message: notification.message,
    action_url: `/dashboard/campaigns/${campaignId}/edit`,
    action_label: notification.actionLabel,
    source_key: `campaign-review:${campaignId}:${decision}`,
    metadata: {
      campaign_id: campaignId,
      organization_id: organizationId,
      review_decision: decision,
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
  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .select('id, name, organization_id, review_status, status')
    .eq('id', campaignId)
    .maybeSingle()

  if (campaignError || !campaign) throw new Error('Campaign was not found.')

  const { data: organization } = await admin
    .from('organizations')
    .select('id')
    .eq('legacy_profile_id', campaign.organization_id)
    .maybeSingle()

  const update: Record<string, unknown> = {
    review_status: decision,
    review_notes: notes || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
  }

  if (decision === 'suspended') update.status = 'paused'

  const { error: updateError } = await admin
    .from('campaigns')
    .update(update)
    .eq('id', campaignId)

  if (updateError) throw new Error('Campaign review could not be saved.')

  const { error: auditError } = await admin.from('campaign_review_events').insert({
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

  if (auditError) {
    console.error('Campaign review audit insert failed', auditError)
    throw new Error('Review changed, but the audit record could not be saved.')
  }

  await notifyOrganizationMembers({
    organizationId: organization?.id ?? null,
    campaignId,
    campaignName: campaign.name,
    decision,
    notes,
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
