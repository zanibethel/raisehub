'use server'

import { revalidatePath } from 'next/cache'

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

  const admin = createAdminClient() as any
  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .select('id, organization_id, review_status, status')
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
    reviewed_by: user.id,
  }

  if (decision === 'suspended') update.status = 'paused'

  const { error: updateError } = await admin
    .from('campaigns')
    .update(update)
    .eq('id', campaignId)

  if (updateError) throw new Error('Campaign review could not be saved.')

  const { error: auditError } = await admin
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
      reviewed_by: user.id,
    })

  if (auditError) {
    console.error('Campaign review audit insert failed', auditError)
    throw new Error('Review changed, but the audit record could not be saved.')
  }

  revalidatePath('/dashboard/owner/campaign-reviews')
  revalidatePath('/dashboard')
}