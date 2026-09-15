import { redirect } from 'next/navigation'

import BusinessProfileForm from '@/app/components/business-profile-form'
import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import { createClient } from '@/lib/supabase/server'

type BusinessProfile = {
  business_name: string | null
  phone: string | null
  address: string | null
  google_maps_url: string | null
  logo_url: string | null
  website_url: string | null
  display_name: string | null
}

export default async function BusinessOffersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name, phone, address, google_maps_url, logo_url, website_url, display_name')
    .eq('id', user.id)
    .maybeSingle<BusinessProfile>()

  return (
    <main className="min-h-screen bg-[#F0F6FF]">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <section id="business-profile" className="mb-5 scroll-mt-24 sm:mb-6">
          <BusinessProfileForm
            businessLegacyProfileId={user.id}
            initialBusinessName={profile?.business_name ?? ''}
            initialPhone={profile?.phone ?? ''}
            initialAddress={profile?.address ?? ''}
            initialGoogleMapsUrl={profile?.google_maps_url ?? ''}
            initialLogoUrl={profile?.logo_url ?? ''}
            initialWebsiteUrl={profile?.website_url ?? ''}
            initialDisplayName={profile?.display_name ?? ''}
          />
        </section>

        <BusinessDashboard view="offers" />
      </div>
    </main>
  )
}
