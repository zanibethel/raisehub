import { createClient } from '@/lib/supabase/server'
import type { WorkspaceCardData } from '@/components/platform/workspace-card'

export async function getOwnerWorkspaces(): Promise<
  WorkspaceCardData[]
> {
  const supabase = await createClient()

  const [
    businessesResult,
    organizationsResult,
    customersResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,business_name,is_active')
      .eq('role', 'business'),

    supabase
      .from('profiles')
      .select('id,organization_name,is_active')
      .eq('role', 'organization'),

    supabase
      .from('profiles')
      .select('id,full_name,is_active')
      .eq('role', 'customer'),
  ])

  const businesses =
    businessesResult.data?.map((profile) => ({
      id: profile.id,
      role: 'business' as const,
      name: profile.business_name ?? 'Unnamed Business',
      subtitle: 'Business Workspace',
      status: profile.is_active ? 'Active' : 'Inactive',
    })) ?? []

  const organizations =
    organizationsResult.data?.map((profile) => ({
      id: profile.id,
      role: 'organization' as const,
      name: profile.organization_name ?? 'Unnamed Organization',
      subtitle: 'Organization Workspace',
      status: profile.is_active ? 'Active' : 'Inactive',
    })) ?? []

  const customers =
    customersResult.data?.map((profile) => ({
      id: profile.id,
      role: 'customer' as const,
      name: profile.full_name ?? 'Unnamed Customer',
      subtitle: 'Customer Workspace',
      status: profile.is_active ? 'Active' : 'Inactive',
    })) ?? []

  return [
    ...businesses,
    ...organizations,
    ...customers,
  ].sort((a, b) => a.name.localeCompare(b.name))
}