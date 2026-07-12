import type { WorkspaceCardData } from '@/components/platform/workspace-card'
import {
  getWorkspaceProfiles,
  type WorkspaceProfile,
} from '@/lib/repositories/workspace-repository'

// =============================================================================
// Display helpers
// =============================================================================

function getWorkspaceName(profile: WorkspaceProfile): string {
  const fallbackEmail = profile.email ?? 'Unnamed account'

  switch (profile.role) {
    case 'business':
      return (
        profile.business_name ??
        profile.display_name ??
        profile.full_name ??
        fallbackEmail
      )

    case 'organization':
      return (
        profile.display_name ??
        profile.full_name ??
        profile.business_name ??
        fallbackEmail
      )

    case 'customer':
      return (
        profile.display_name ??
        profile.full_name ??
        profile.email ??
        'Unnamed Customer'
      )
  }
}

function getWorkspaceSubtitle(profile: WorkspaceProfile): string {
  switch (profile.role) {
    case 'business':
      return `${
        profile.subscription_tier === 'free'
          ? 'Free'
          : profile.subscription_tier
      } business account`

    case 'organization':
      return 'Fundraising organization'

    case 'customer':
      return profile.email ?? 'Customer account'
  }
}

function getWorkspaceStatus(profile: WorkspaceProfile): string {
  return profile.onboarding_completed
    ? 'Ready'
    : 'Setup incomplete'
}

// =============================================================================
// Mapping
// =============================================================================

function mapProfileToWorkspace(
  profile: WorkspaceProfile
): WorkspaceCardData {
  return {
    id: profile.id,
    role: profile.role,
    name: getWorkspaceName(profile),
    subtitle: getWorkspaceSubtitle(profile),
    status: getWorkspaceStatus(profile),
  }
}

// =============================================================================
// Service
// =============================================================================

export async function getOwnerWorkspaces(): Promise<
  WorkspaceCardData[]
> {
  const { profiles, error } = await getWorkspaceProfiles()

  if (error) {
    console.error('Unable to load owner workspaces:', error)
    return []
  }

  return profiles
    .map(mapProfileToWorkspace)
    .sort((firstWorkspace, secondWorkspace) =>
      firstWorkspace.name.localeCompare(secondWorkspace.name)
    )
}