'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function cleanWorkspaceKey(value: string) {
  return value.trim().slice(0, 200)
}

async function getActor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

async function getExistingInteraction(
  campaignId: string,
  userId: string,
  workspaceKey: string
) {
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('spotlight_interactions')
    .select('id, view_count, first_viewed_at, last_viewed_at, dismissed_at, clicked_at')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .eq('workspace_key', workspaceKey)
    .maybeSingle()

  return data as
    | {
        id: string
        view_count: number
        first_viewed_at: string | null
        last_viewed_at: string | null
        dismissed_at: string | null
        clicked_at: string | null
      }
    | null
}

export async function recordSpotlightViewAction(campaignId: string, rawWorkspaceKey: string) {
  const user = await getActor()
  if (!user) return { success: false as const }

  const workspaceKey = cleanWorkspaceKey(rawWorkspaceKey)
  const existing = await getExistingInteraction(campaignId, user.id, workspaceKey)
  const admin = createAdminClient() as any
  const now = new Date().toISOString()

  const { error } = await admin.from('spotlight_interactions').upsert(
    {
      campaign_id: campaignId,
      user_id: user.id,
      workspace_key: workspaceKey,
      view_count: (existing?.view_count ?? 0) + 1,
      first_viewed_at: existing?.first_viewed_at ?? now,
      last_viewed_at: now,
      dismissed_at: existing?.dismissed_at ?? null,
      clicked_at: existing?.clicked_at ?? null,
    },
    { onConflict: 'campaign_id,user_id,workspace_key' }
  )

  if (error) console.error('Unable to record Spotlight view:', error.message)
  return { success: !error }
}

export async function dismissSpotlightAction(campaignId: string, rawWorkspaceKey: string) {
  const user = await getActor()
  if (!user) return { success: false as const }

  const workspaceKey = cleanWorkspaceKey(rawWorkspaceKey)
  const existing = await getExistingInteraction(campaignId, user.id, workspaceKey)
  const admin = createAdminClient() as any
  const now = new Date().toISOString()

  const { error } = await admin.from('spotlight_interactions').upsert(
    {
      campaign_id: campaignId,
      user_id: user.id,
      workspace_key: workspaceKey,
      view_count: existing?.view_count ?? 0,
      first_viewed_at: existing?.first_viewed_at ?? null,
      last_viewed_at: existing?.last_viewed_at ?? null,
      dismissed_at: now,
      clicked_at: existing?.clicked_at ?? null,
    },
    { onConflict: 'campaign_id,user_id,workspace_key' }
  )

  if (error) console.error('Unable to dismiss Spotlight:', error.message)
  return { success: !error }
}

export async function recordSpotlightClickAction(campaignId: string, rawWorkspaceKey: string) {
  const user = await getActor()
  if (!user) return { success: false as const }

  const workspaceKey = cleanWorkspaceKey(rawWorkspaceKey)
  const existing = await getExistingInteraction(campaignId, user.id, workspaceKey)
  const admin = createAdminClient() as any
  const now = new Date().toISOString()

  const { error } = await admin.from('spotlight_interactions').upsert(
    {
      campaign_id: campaignId,
      user_id: user.id,
      workspace_key: workspaceKey,
      view_count: existing?.view_count ?? 0,
      first_viewed_at: existing?.first_viewed_at ?? null,
      last_viewed_at: existing?.last_viewed_at ?? null,
      dismissed_at: existing?.dismissed_at ?? null,
      clicked_at: now,
    },
    { onConflict: 'campaign_id,user_id,workspace_key' }
  )

  if (error) console.error('Unable to record Spotlight click:', error.message)
  return { success: !error }
}
