import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { SelectableWorkspace } from '@/lib/types/identity-access'

export type SpotlightCampaign = {
  id: string
  title: string
  body: string | null
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  secondary_cta_label: string | null
  secondary_cta_url: string | null
  kind: 'announcement' | 'upgrade' | 'business_promo' | 'organization_promo' | 'event_promo' | 'system'
  audience_roles: string[]
  environment_scope: 'all' | 'production' | 'demo'
  target_business_id: string | null
  target_organization_id: string | null
  target_demo_group: string | null
  source_type: string | null
  source_id: string | null
  metadata: Record<string, unknown>
  priority: number
  starts_at: string
  ends_at: string | null
  dismissible: boolean
  max_views_per_user: number
  repeat_after_hours: number | null
}

type SpotlightInteraction = {
  campaign_id: string
  view_count: number
  last_viewed_at: string | null
  dismissed_at: string | null
}

function targetMatches(campaign: SpotlightCampaign, workspace: SelectableWorkspace | null) {
  if (campaign.target_business_id) {
    return workspace?.kind === 'business' && workspace.workspaceId === campaign.target_business_id
  }

  if (campaign.target_organization_id) {
    return (
      (workspace?.kind === 'organization' || workspace?.kind === 'fundraising') &&
      workspace.workspaceId === campaign.target_organization_id
    )
  }

  return true
}

function interactionAllowsDisplay(
  campaign: SpotlightCampaign,
  interaction: SpotlightInteraction | undefined,
  nowMs: number
) {
  if (!interaction) return true
  if (interaction.dismissed_at) return false
  if (interaction.view_count >= campaign.max_views_per_user) return false

  if (campaign.repeat_after_hours && interaction.last_viewed_at) {
    const nextAllowed =
      new Date(interaction.last_viewed_at).getTime() + campaign.repeat_after_hours * 60 * 60 * 1000
    if (nowMs < nextAllowed) return false
  }

  return true
}

export async function getEligibleSpotlights({
  userId,
  experienceRole,
  selectedWorkspace,
  isDemo,
  demoGroup,
}: {
  userId: string
  experienceRole: string
  selectedWorkspace: SelectableWorkspace | null
  isDemo: boolean
  demoGroup?: string | null
}): Promise<SpotlightCampaign[]> {
  const admin = createAdminClient() as any
  const now = new Date()
  const nowIso = now.toISOString()
  const workspaceKey = selectedWorkspace?.key ?? `${experienceRole}:default`

  const { data: campaigns, error } = await admin
    .from('spotlight_campaigns')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', nowIso)
    .order('priority', { ascending: false })
    .order('starts_at', { ascending: false })

  if (error) {
    console.error('Unable to load Spotlight campaigns:', error.message)
    return []
  }

  const candidates = ((campaigns ?? []) as SpotlightCampaign[]).filter((campaign) => {
    if (campaign.ends_at && new Date(campaign.ends_at).getTime() <= now.getTime()) return false
    if (!campaign.audience_roles.includes(experienceRole)) return false
    if (campaign.environment_scope === 'demo' && !isDemo) return false
    if (campaign.environment_scope === 'production' && isDemo) return false
    if (campaign.target_demo_group && campaign.target_demo_group !== (demoGroup?.trim() || null)) {
      return false
    }
    return targetMatches(campaign, selectedWorkspace)
  })

  if (candidates.length === 0) return []

  const campaignIds = candidates.map((campaign) => campaign.id)
  const { data: interactions, error: interactionError } = await admin
    .from('spotlight_interactions')
    .select('campaign_id, view_count, last_viewed_at, dismissed_at')
    .eq('user_id', userId)
    .eq('workspace_key', workspaceKey)
    .in('campaign_id', campaignIds)

  if (interactionError) {
    console.error('Unable to load Spotlight interaction state:', interactionError.message)
    return []
  }

  const interactionByCampaign = new Map(
    ((interactions ?? []) as SpotlightInteraction[]).map((interaction) => [
      interaction.campaign_id,
      interaction,
    ])
  )

  return candidates
    .filter((campaign) =>
      interactionAllowsDisplay(campaign, interactionByCampaign.get(campaign.id), now.getTime())
    )
    .slice(0, 3)
}
