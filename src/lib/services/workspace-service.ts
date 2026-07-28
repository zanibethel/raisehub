import type { WorkspaceCardData } from '@/lib/types/identity-access'
import {
  getWorkspaceProfiles,
  type WorkspaceProfile,
} from '@/lib/repositories/workspace-repository'

type SetupItem = { label: string; complete: boolean }

function getWorkspaceName(profile: WorkspaceProfile): string {
  const fallbackEmail = profile.email ?? 'Unnamed account'
  switch (profile.role) {
    case 'business':
      return profile.business_name ?? profile.display_name ?? profile.full_name ?? fallbackEmail
    case 'organization':
      return profile.display_name ?? profile.full_name ?? profile.business_name ?? fallbackEmail
    case 'customer':
      return profile.display_name ?? profile.full_name ?? profile.email ?? 'Unnamed Customer'
  }
}

function getPlanLabel(profile: WorkspaceProfile): string {
  if (profile.role !== 'business') return 'Standard account'
  const tier = profile.subscription_tier.trim().toLowerCase()
  if (!tier || tier === 'free') return 'Free plan'
  return `${profile.subscription_tier} plan`
}

function getWorkspaceSubtitle(profile: WorkspaceProfile): string {
  if (profile.role === 'business') return 'Business workspace'
  if (profile.role === 'organization') return 'Fundraising organization'
  return 'Customer account'
}

function getSetupItems(profile: WorkspaceProfile): SetupItem[] {
  if (profile.role === 'business') {
    return [
      { label: 'Business name', complete: Boolean(profile.business_name?.trim() || profile.display_name?.trim()) },
      { label: 'Email', complete: Boolean(profile.email?.trim()) },
      { label: 'Phone', complete: Boolean(profile.phone?.trim()) },
      { label: 'Address', complete: Boolean(profile.address?.trim()) },
      { label: 'Logo', complete: Boolean(profile.logo_url?.trim()) },
      { label: 'Description', complete: Boolean(profile.business_description?.trim()) },
      { label: 'Onboarding', complete: profile.onboarding_completed },
    ]
  }

  if (profile.role === 'organization') {
    return [
      { label: 'Organization name', complete: Boolean(profile.display_name?.trim() || profile.full_name?.trim() || profile.business_name?.trim()) },
      { label: 'Email', complete: Boolean(profile.email?.trim()) },
      { label: 'Phone', complete: Boolean(profile.phone?.trim()) },
      { label: 'Address', complete: Boolean(profile.address?.trim()) },
      { label: 'Onboarding', complete: profile.onboarding_completed },
    ]
  }

  return [
    { label: 'Name', complete: Boolean(profile.display_name?.trim() || profile.full_name?.trim()) },
    { label: 'Email', complete: Boolean(profile.email?.trim()) },
    { label: 'Phone', complete: Boolean(profile.phone?.trim()) },
  ]
}

function getSetupSummary(profile: WorkspaceProfile) {
  const items = getSetupItems(profile)
  const completedItems = items.filter((item) => item.complete).length
  const totalItems = items.length
  return {
    completedItems,
    totalItems,
    setupPercentage: totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100),
    missingSetupItems: items.filter((item) => !item.complete).map((item) => item.label),
  }
}

function getWorkspaceStatus(profile: WorkspaceProfile, setupPercentage: number): string {
  const lifecycleStatus = profile.lifecycle_status?.trim().toLowerCase()
  if (lifecycleStatus === 'archived') return 'Archived'
  if (lifecycleStatus === 'restore_requested') return 'Restore requested'
  if (lifecycleStatus === 'suspended') return 'Suspended'
  if (lifecycleStatus === 'inactive') return 'Inactive'
  if (setupPercentage >= 100) return 'Ready'
  if (setupPercentage >= 50) return 'In progress'
  return 'Setup incomplete'
}

function mapProfileToWorkspace(profile: WorkspaceProfile): WorkspaceCardData {
  const setup = getSetupSummary(profile)
  return {
    id: profile.canonical_workspace_id ?? profile.id,
    role: profile.role,
    name: getWorkspaceName(profile),
    subtitle: getWorkspaceSubtitle(profile),
    status: getWorkspaceStatus(profile, setup.setupPercentage),
    planLabel: getPlanLabel(profile),
    setupPercentage: setup.setupPercentage,
    completedSetupItems: setup.completedItems,
    totalSetupItems: setup.totalItems,
    missingSetupItems: setup.missingSetupItems,
    email: profile.email,
    phone: profile.phone,
    isDemo: profile.is_demo,
    address: profile.address,
    websiteUrl: profile.website_url,
    logoUrl: profile.logo_url,
    description: profile.business_description,
    category: profile.business_category,
    facebookUrl: profile.facebook_url,
    instagramUrl: profile.instagram_url,
    tiktokUrl: profile.tiktok_url,
  } as WorkspaceCardData
}

type OwnerWorkspacesResult = { workspaces: WorkspaceCardData[]; error: string | null }

export async function getOwnerWorkspacesResult(): Promise<OwnerWorkspacesResult> {
  const { profiles, error } = await getWorkspaceProfiles()
  if (error) return { workspaces: [], error }
  const workspaces = profiles
    .map(mapProfileToWorkspace)
    .sort((firstWorkspace, secondWorkspace) => firstWorkspace.name.localeCompare(secondWorkspace.name))
  return { workspaces, error: null }
}

export async function getOwnerWorkspaces(): Promise<WorkspaceCardData[]> {
  const { workspaces, error } = await getOwnerWorkspacesResult()
  if (error) console.error('Unable to load owner workspaces:', error)
  return workspaces
}
