import Link from 'next/link'
import { redirect } from 'next/navigation'

import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import EditCampaignForm from './edit-campaign-form'

type EditCampaignPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditCampaignPage({
  params,
}: EditCampaignPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select(
      `
        id,
        name,
        description,
        goal_amount,
        starts_at,
        ends_at,
        status,
        organization_id
      `
    )
    .eq('id', id)
    .eq('organization_id', user.id)
    .single()

  if (!campaign) {
    redirect('/dashboard')
  }

  const admin = createAdminClient()
  const [
    { data: canonicalOrganization },
    { data: organizationProfile },
  ] = await Promise.all([
    admin
      .from('organizations')
      .select('id')
      .eq('legacy_profile_id', campaign.organization_id)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('is_demo')
      .eq('id', campaign.organization_id)
      .maybeSingle(),
  ])

  const effectivePricing = await resolveEffectivePricing({
    campaignId: campaign.id,
    organizationId: canonicalOrganization?.id ?? null,
    isDemo: organizationProfile?.is_demo ?? false,
  })

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-8 sm:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-blue-100 bg-white/95 p-6 shadow-xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-blue-800">
          Manage Campaign
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Update campaign details and review the pricing that will appear on the public campaign page after publishing.
        </p>

        <div className="mt-6">
          <EditCampaignForm
            campaignId={campaign.id}
            initialName={campaign.name ?? ''}
            initialDescription={campaign.description ?? ''}
            initialGoalAmount={String(campaign.goal_amount ?? 0)}
            initialStartsAt={campaign.starts_at ?? ''}
            initialEndsAt={campaign.ends_at ?? ''}
            passPrice={effectivePricing.passPrice}
            platformFeePercent={effectivePricing.platformFeePercent}
            organizationPassEarnings={effectivePricing.organizationPassEarnings}
            pricingScope={effectivePricing.pricingScope}
          />
        </div>
      </section>
    </main>
  )
}
