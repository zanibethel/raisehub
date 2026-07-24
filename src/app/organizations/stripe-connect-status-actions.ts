'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type StripeStatusResult =
  | {
      status: 'ok'
      onboardingStatus: string
      payoutsEnabled: boolean
      detailsSubmitted: boolean
      chargesEnabled: boolean
    }
  | { status: 'error'; message: string }

type StripeAccountRow = {
  onboarding_status: string
  payouts_enabled: boolean
  details_submitted: boolean
  charges_enabled: boolean
}

export async function getOrganizationStripeStatusAction(
  organizationId: string
): Promise<StripeStatusResult> {
  const cleanOrganizationId = organizationId.trim()

  if (!cleanOrganizationId) {
    return {
      status: 'error',
      message: 'Choose an Organization workspace to view payout status.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: 'error', message: 'Log in to view payout status.' }
  }

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('membership_role, status')
    .eq('organization_id', cleanOrganizationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('membership_role', ['admin', 'manager'])
    .maybeSingle()

  if (!membership) {
    return {
      status: 'error',
      message: 'You do not have permission to view payouts for this organization.',
    }
  }

  const admin = createAdminClient() as any
  const { data, error } = (await admin
    .from('organization_stripe_accounts')
    .select(
      'onboarding_status, payouts_enabled, details_submitted, charges_enabled'
    )
    .eq('organization_id', cleanOrganizationId)
    .maybeSingle()) as {
    data: StripeAccountRow | null
    error: { message: string } | null
  }

  if (error) {
    console.error('Organization Stripe status lookup failed', {
      organizationId: cleanOrganizationId,
      error,
    })

    return {
      status: 'error',
      message: 'RaiseHub could not load the current payout status.',
    }
  }

  return {
    status: 'ok',
    onboardingStatus: data?.onboarding_status ?? 'not_started',
    payoutsEnabled: data?.payouts_enabled ?? false,
    detailsSubmitted: data?.details_submitted ?? false,
    chargesEnabled: data?.charges_enabled ?? false,
  }
}
