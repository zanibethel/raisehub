'use server'

import { resolveCurrentBusinessWorkspace } from '@/lib/services/current-business-workspace-service'
import { createClient } from '@/lib/supabase/server'

type OfferDraftPayload = Record<string, unknown>

type SaveOfferDraftInput = {
  selectedGoal: string | null
  selectedSuggestionId: string | null
  draft: OfferDraftPayload
}

export async function getBusinessOfferWizardContextAction() {
  const workspaceResult = await resolveCurrentBusinessWorkspace({ requireManage: true })
  if (!workspaceResult.success) {
    return { success: false as const, error: workspaceResult.error }
  }

  const { workspace } = workspaceResult
  const supabase = await createClient()

  if (workspace.canonicalBusinessId) {
    const [{ data: business, error: businessError }, { data: savedDraft, error: draftError }] =
      await Promise.all([
        (supabase as any)
          .from('businesses')
          .select('name, category')
          .eq('id', workspace.canonicalBusinessId)
          .maybeSingle(),
        (supabase as any)
          .from('business_workspace_offer_drafts')
          .select('selected_goal, selected_suggestion_id, draft, updated_at')
          .eq('business_id', workspace.canonicalBusinessId)
          .maybeSingle(),
      ])

    if (businessError) {
      return { success: false as const, error: 'We could not load the selected business.' }
    }
    if (draftError) {
      return { success: false as const, error: 'We could not load the saved offer draft.' }
    }

    return {
      success: true as const,
      businessName: String(business?.name ?? ''),
      businessCategory: String(business?.category ?? ''),
      savedDraft: savedDraft ?? null,
      canonicalBusinessId: workspace.canonicalBusinessId,
    }
  }

  const legacyProfileId = workspace.legacyProfileId ?? workspace.userId
  const [{ data: profile, error: profileError }, { data: savedDraft, error: draftError }] =
    await Promise.all([
      (supabase as any)
        .from('profiles')
        .select('business_name, business_category')
        .eq('id', legacyProfileId)
        .maybeSingle(),
      (supabase as any)
        .from('business_offer_drafts')
        .select('selected_goal, selected_suggestion_id, draft, updated_at')
        .eq('business_id', legacyProfileId)
        .maybeSingle(),
    ])

  if (profileError) {
    return { success: false as const, error: 'We could not load your business profile.' }
  }
  if (draftError) {
    return { success: false as const, error: 'We could not load the saved offer draft.' }
  }

  return {
    success: true as const,
    businessName: String(profile?.business_name ?? ''),
    businessCategory: String(profile?.business_category ?? ''),
    savedDraft: savedDraft ?? null,
    canonicalBusinessId: null,
  }
}

export async function updateBusinessOfferWizardCategoryAction(category: string) {
  const normalizedCategory = category.trim()
  if (!normalizedCategory) {
    return { success: false as const, error: 'Choose a business type before saving.' }
  }

  const workspaceResult = await resolveCurrentBusinessWorkspace({ requireManage: true })
  if (!workspaceResult.success) {
    return { success: false as const, error: workspaceResult.error }
  }

  const { workspace } = workspaceResult
  const supabase = await createClient()

  if (workspace.canonicalBusinessId) {
    const { error } = await (supabase as any)
      .from('businesses')
      .update({ category: normalizedCategory, updated_at: new Date().toISOString() })
      .eq('id', workspace.canonicalBusinessId)

    if (error) return { success: false as const, error: error.message }

    if (workspace.legacyProfileId) {
      await (supabase as any)
        .from('profiles')
        .update({ business_category: normalizedCategory })
        .eq('id', workspace.legacyProfileId)
    }

    return { success: true as const }
  }

  const legacyProfileId = workspace.legacyProfileId ?? workspace.userId
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ business_category: normalizedCategory })
    .eq('id', legacyProfileId)

  return error
    ? { success: false as const, error: error.message }
    : { success: true as const }
}

export async function saveBusinessOfferDraftAction(input: SaveOfferDraftInput) {
  if (!input.draft || typeof input.draft !== 'object' || Array.isArray(input.draft)) {
    return { success: false as const, error: 'The offer draft is invalid.' }
  }

  const workspaceResult = await resolveCurrentBusinessWorkspace({ requireManage: true })
  if (!workspaceResult.success) {
    return { success: false as const, error: workspaceResult.error }
  }

  const { workspace } = workspaceResult
  const supabase = await createClient()
  const values = {
    selected_goal: input.selectedGoal,
    selected_suggestion_id: input.selectedSuggestionId,
    draft: input.draft,
    updated_at: new Date().toISOString(),
  }

  const result = workspace.canonicalBusinessId
    ? await (supabase as any)
        .from('business_workspace_offer_drafts')
        .upsert({ business_id: workspace.canonicalBusinessId, ...values }, { onConflict: 'business_id' })
    : await (supabase as any)
        .from('business_offer_drafts')
        .upsert(
          { business_id: workspace.legacyProfileId ?? workspace.userId, ...values },
          { onConflict: 'business_id' }
        )

  return result.error
    ? { success: false as const, error: result.error.message }
    : { success: true as const }
}

export async function deleteBusinessOfferDraftAction() {
  const workspaceResult = await resolveCurrentBusinessWorkspace({ requireManage: true })
  if (!workspaceResult.success) {
    return { success: false as const, error: workspaceResult.error }
  }

  const { workspace } = workspaceResult
  const supabase = await createClient()

  const result = workspace.canonicalBusinessId
    ? await (supabase as any)
        .from('business_workspace_offer_drafts')
        .delete()
        .eq('business_id', workspace.canonicalBusinessId)
    : await (supabase as any)
        .from('business_offer_drafts')
        .delete()
        .eq('business_id', workspace.legacyProfileId ?? workspace.userId)

  return result.error
    ? { success: false as const, error: result.error.message }
    : { success: true as const }
}
