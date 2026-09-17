import 'server-only'

import { cookies } from 'next/headers'

import { getBusinessById } from '@/lib/repositories/business-repository'
import { canManageBusiness, canViewBusiness } from '@/lib/services/capability-resolution-service'
import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { createClient } from '@/lib/supabase/server'

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'

type ResolveCurrentBusinessWorkspaceOptions = {
  requireManage?: boolean
}

export type CurrentBusinessWorkspace = {
  userId: string
  canonicalBusinessId: string | null
  legacyProfileId: string | null
  offerBusinessIds: string[]
  primaryOfferBusinessId: string
  subscriptionTier: string
}

export type CurrentBusinessWorkspaceResult =
  | { success: true; workspace: CurrentBusinessWorkspace }
  | { success: false; error: string }

export async function resolveCurrentBusinessWorkspace(
  options: ResolveCurrentBusinessWorkspaceOptions = {}
): Promise<CurrentBusinessWorkspaceResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be logged in.' }
  }

  const workspacesResult = await getAuthenticatedWorkspaces()
  if (!workspacesResult.success) {
    return { success: false, error: 'Your business workspace could not be loaded.' }
  }

  const savedWorkspaceKey =
    (await cookies()).get(WORKSPACE_PREFERENCE_COOKIE)?.value.trim() || null
  const businessWorkspaces = workspacesResult.workspaces.filter(
    (workspace) => workspace.kind === 'business'
  )

  const selectedWorkspace =
    (savedWorkspaceKey
      ? businessWorkspaces.find((workspace) => workspace.key === savedWorkspaceKey)
      : null) ??
    businessWorkspaces.find((workspace) => workspace.isDefault) ??
    (businessWorkspaces.length === 1 ? businessWorkspaces[0] : null)

  if (!selectedWorkspace) {
    return {
      success: false,
      error:
        businessWorkspaces.length > 1
          ? 'Choose the business workspace you want to manage, then try again.'
          : 'No business workspace is available for this account.',
    }
  }

  const canonicalBusinessId = selectedWorkspace.workspaceId
  const legacyProfileId = selectedWorkspace.legacyProfileId

  if (canonicalBusinessId) {
    const capability = options.requireManage
      ? await canManageBusiness(canonicalBusinessId)
      : await canViewBusiness(canonicalBusinessId)

    if (!capability.allowed) {
      return {
        success: false,
        error: options.requireManage
          ? 'You do not have permission to manage this business.'
          : 'You do not have permission to view this business.',
      }
    }

    const { business, error } = await getBusinessById(canonicalBusinessId)
    if (error || !business) {
      return { success: false, error: 'This business workspace could not be loaded.' }
    }

    const resolvedLegacyProfileId = business.legacy_profile_id ?? legacyProfileId
    const offerBusinessIds = [canonicalBusinessId, resolvedLegacyProfileId].filter(
      (value): value is string => Boolean(value)
    )

    return {
      success: true,
      workspace: {
        userId: user.id,
        canonicalBusinessId,
        legacyProfileId: resolvedLegacyProfileId,
        offerBusinessIds: [...new Set(offerBusinessIds)],
        primaryOfferBusinessId: canonicalBusinessId,
        subscriptionTier: business.subscription_tier ?? 'free',
      },
    }
  }

  const resolvedLegacyProfileId = legacyProfileId ?? user.id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, subscription_tier')
    .eq('id', resolvedLegacyProfileId)
    .maybeSingle()

  if (profileError || !profile || profile.role !== 'business') {
    return { success: false, error: 'This business workspace could not be loaded.' }
  }

  if (resolvedLegacyProfileId !== user.id) {
    return { success: false, error: 'You do not have permission to manage this business.' }
  }

  return {
    success: true,
    workspace: {
      userId: user.id,
      canonicalBusinessId: null,
      legacyProfileId: resolvedLegacyProfileId,
      offerBusinessIds: [resolvedLegacyProfileId],
      primaryOfferBusinessId: resolvedLegacyProfileId,
      subscriptionTier: profile.subscription_tier ?? 'free',
    },
  }
}
