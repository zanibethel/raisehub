import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import OrganizationProfileSetupSection from './sections/organization-profile-setup-section'

export default async function OrganizationProfileSetupLoader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const admin = createAdminClient()
  const [{ data: profile }, { data: organization }] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'business_name, display_name, business_description, phone, email, website_url, role'
      )
      .eq('id', user.id)
      .maybeSingle(),
    admin
      .from('organizations')
      .select(
        'name, organization_type, description, phone, email, website_url, town_name, state_code'
      )
      .eq('legacy_profile_id', user.id)
      .maybeSingle(),
  ])

  if (profile?.role !== 'organization') {
    return null
  }

  const profileData = {
    name:
      organization?.name ||
      profile.business_name ||
      profile.display_name ||
      '',
    organizationType: organization?.organization_type || '',
    description:
      organization?.description ||
      profile.business_description ||
      '',
    phone: organization?.phone || profile.phone || '',
    email: organization?.email || profile.email || user.email || '',
    websiteUrl:
      organization?.website_url || profile.website_url || '',
    townName: organization?.town_name || '',
    stateCode: organization?.state_code || '',
  }

  const isComplete = Boolean(
    profileData.name.trim() &&
      profileData.townName.trim() &&
      /^[A-Z]{2}$/.test(profileData.stateCode)
  )

  return (
    <OrganizationProfileSetupSection
      profile={profileData}
      isComplete={isComplete}
    />
  )
}
