import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

type OrganizationRow = {
  id: string
}

type OrganizationMembershipRow = {
  organization_id: string
}

export default async function CurrentOrganizationPayoutPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: legacyOrganization } = await supabase
    .from('organizations')
    .select('id')
    .eq('legacy_profile_id', user.id)
    .maybeSingle<OrganizationRow>()

  if (legacyOrganization?.id) {
    redirect(`/organizations/${legacyOrganization.id}/payouts`)
  }

  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('membership_role', ['admin', 'manager'])
    .limit(2)

  const activeMemberships = (memberships ?? []) as OrganizationMembershipRow[]

  if (activeMemberships.length === 1) {
    redirect(
      `/organizations/${activeMemberships[0].organization_id}/payouts`
    )
  }

  if (activeMemberships.length > 1) {
    redirect('/dashboard?notice=select-organization-for-payouts')
  }

  notFound()
}
