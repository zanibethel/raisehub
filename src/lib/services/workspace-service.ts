import type { WorkspaceCardData } from '@/components/platform/workspace-card'
import {
  getWorkspaceProfiles,
  type WorkspaceProfile,
} from '@/lib/repositories/workspace-repository'

// =============================================================================
// Types
// =============================================================================

type SetupItem = {
  label: string
  complete: boolean
}

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

function getPlanLabel(profile: WorkspaceProfile): string {
  if (profile.role !== 'business') {
    return 'Standard account'
  }

  const tier = profile.subscription_tier.trim().toLowerCase()

  if (!tier || tier === 'free') {
    return 'Free plan'
  }

  return `${profile.subscription_tier} plan`
}

function getWorkspaceSubtitle(profile: WorkspaceProfile): string {
  switch (profile.role) {
    case 'business':
      return 'Business workspace'

    case 'organization':
      return 'Fundraising organization'

    case 'customer':
      return 'Customer account'
  }
}

// =============================================================================
// Setup progress
// =============================================================================

function getBusinessSetupItems(
  profile: WorkspaceProfile
): SetupItem[] {
  return [
    {
      label: 'Business name',
      complete: Boolean(
        profile.business_name?.trim() ||
          profile.display_name?.trim()
      ),
    },
    {
      label: 'Email',
      complete: Boolean(profile.email?.trim()),
    },
    {
      label: 'Phone',
      complete: Boolean(profile.phone?.trim()),
    },
    {
      label: 'Address',
      complete: Boolean(profile.address?.trim()),
    },
    {
      label: 'Logo',
      complete: Boolean(profile.logo_url?.trim()),
    },
    {
      label: 'Description',
      complete: Boolean(
        profile.business_description?.trim()
      ),
    },
    {
      label: 'Onboarding',
      complete: profile.onboarding_completed,
    },
  ]
}

function getOrganizationSetupItems(
  profile: WorkspaceProfile
): SetupItem[] {
  return [
    {
      label: 'Organization name',
      complete: Boolean(
        profile.display_name?.trim() ||
          profile.full_name?.trim() ||
          profile.business_name?.trim()
      ),
    },
    {
      label: 'Email',
      complete: Boolean(profile.email?.trim()),
    },
    {
      label: 'Phone',
      complete: Boolean(profile.phone?.trim()),
    },
    {
      label: 'Address',
      complete: Boolean(profile.address?.trim()),
    },
    {
      label: 'Onboarding',
      complete: profile.onboarding_completed,
    },
  ]
}

function getCustomerSetupItems(
  profile: WorkspaceProfile
): SetupItem[] {
  return [
    {
      label: 'Name',
      complete: Boolean(
        profile.display_name?.trim() ||
          profile.full_name?.trim()
      ),
    },
    {
      label: 'Email',
      complete: Boolean(profile.email?.trim()),
    },
    {
      label: 'Phone',
      complete: Boolean(profile.phone?.trim()),
    },
  ]
}

function getSetupItems(
  profile: WorkspaceProfile
): SetupItem[] {
  switch (profile.role) {
    case 'business':
      return getBusinessSetupItems(profile)

    case 'organization':
      return getOrganizationSetupItems(profile)

    case 'customer':
      return getCustomerSetupItems(profile)
  }
}

function getSetupSummary(profile: WorkspaceProfile) {
  const items = getSetupItems(profile)

  const completedItems = items.filter(
    (item) => item.complete
  ).length

  const totalItems = items.length

  const setupPercentage =
    totalItems === 0
      ? 0
      : Math.round((completedItems / totalItems) * 100)

  const missingSetupItems = items
    .filter((item) => !item.complete)
    .map((item) => item.label)

  return {
    completedItems,
    totalItems,
    setupPercentage,
    missingSetupItems,
  }
}

function getWorkspaceStatus(
  setupPercentage: number
): string {
  if (setupPercentage >= 100) {
    return 'Ready'
  }

  if (setupPercentage >= 50) {
    return 'In progress'
  }

  return 'Setup incomplete'
}

// =============================================================================
// Mapping
// =============================================================================

function mapProfileToWorkspace(
  profile: WorkspaceProfile
): WorkspaceCardData {
  const setup = getSetupSummary(profile)

  return {
    id: profile.id,
    role: profile.role,
    name: getWorkspaceName(profile),
    subtitle: getWorkspaceSubtitle(profile),
    status: getWorkspaceStatus(
      setup.setupPercentage
    ),

    planLabel: getPlanLabel(profile),

    setupPercentage: setup.setupPercentage,
    completedSetupItems: setup.completedItems,
    totalSetupItems: setup.totalItems,
    missingSetupItems: setup.missingSetupItems,

    email: profile.email,
    phone: profile.phone,
  }
}

// =============================================================================
// Service
// =============================================================================

export async function getOwnerWorkspaces(): Promise<
  WorkspaceCardData[]
> {
  const { profiles, error } =
    await getWorkspaceProfiles()

  if (error) {
    console.error(
      'Unable to load owner workspaces:',
      error
    )

    return []
  }

  return profiles
    .map(mapProfileToWorkspace)
    .sort((firstWorkspace, secondWorkspace) =>
      firstWorkspace.name.localeCompare(
        secondWorkspace.name
      )
    )
}