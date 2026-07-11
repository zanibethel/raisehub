import { createClient } from '@/lib/supabase/server'

export async function getWorkspaceProfiles() {
  const supabase = await createClient()

  const [businesses, organizations, customers] = await Promise.all([
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

  return {
    businesses: businesses.data ?? [],
    organizations: organizations.data ?? [],
    customers: customers.data ?? [],
  }
}