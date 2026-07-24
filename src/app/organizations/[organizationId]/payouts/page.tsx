import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import OrganizationPayoutSetupCard from '@/components/dashboards/organization/organization-payout-setup-card'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type OrganizationPayoutPageProps = {
  params: Promise<{ organizationId: string }>
}

type OrganizationRow = {
  id: string
  name: string
}

type StripeAccountRow = {
  onboarding_status: string
  payouts_enabled: boolean
  details_submitted: boolean
}

export default async function OrganizationPayoutPage({
  params,
}: OrganizationPayoutPageProps) {
  const { organizationId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('membership_role, status')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('membership_role', ['admin', 'manager'])
    .maybeSingle()

  if (!membership) notFound()

  const admin = createAdminClient()
  const untypedAdmin = admin as any
  const [{ data: organization }, stripeAccountResult] = await Promise.all([
    admin
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .maybeSingle<OrganizationRow>(),
    untypedAdmin
      .from('organization_stripe_accounts')
      .select('onboarding_status, payouts_enabled, details_submitted')
      .eq('organization_id', organizationId)
      .maybeSingle(),
  ])

  const stripeAccount = stripeAccountResult.data as StripeAccountRow | null

  if (!organization) notFound()

  return (
    <main className="min-h-screen bg-[#F0F6FF] p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-blue-600">Organization payouts</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {organization.name}
          </h1>
          <p className="mt-2 text-gray-600">
            Complete Stripe verification before RaiseHub transfers campaign proceeds.
          </p>
          <Link
            href={`/dashboard?workspace=${encodeURIComponent(`organization:${organization.id}`)}`}
            className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            ← Return to Organization dashboard
          </Link>
        </header>

        <OrganizationPayoutSetupCard
          organizationId={organization.id}
          status={stripeAccount?.onboarding_status ?? 'not_started'}
          payoutsEnabled={stripeAccount?.payouts_enabled ?? false}
          detailsSubmitted={stripeAccount?.details_submitted ?? false}
        />
      </div>
    </main>
  )
}
