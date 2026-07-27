'use server'

import { cookies } from 'next/headers'

import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { evaluateOrganizationPayoutReadiness } from '@/lib/stripe/organization-payout-readiness'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'

type StripeStatusResult =
  | {
      status: 'ok'
      organizationId: string
      onboardingStatus: string
      payoutsEnabled: boolean
      detailsSubmitted: boolean
      chargesEnabled: boolean
      livemode: boolean | null
      payoutReady: boolean
      mode: 'test' | 'live'
      blockers: string[]
    }
  | { status: 'error'; message: string }

type StripeAccountRow = {
  onboarding_status: string
  payouts_enabled: boolean
  details_submitted: boolean
  charges_enabled: boolean
  livemode: boolean
  disabled_reason: string | null
  requirements_currently_due: unknown
}

export async function getOrganizationStripeStatusAction(): Promise<StripeStatusResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: 'error', message: 'Log in to view payout status.' }
  }

  const workspaceResult = await getAuthenticatedWorkspaces()
  const selectedWorkspaceKey =
    (await cookies()).get(WORKSPACE_PREFERENCE_COOKIE)?.value.trim() || ''
  const selectedWorkspace = workspaceResult.success
    ? workspaceResult.workspaces.find(
        (workspace) =>
          workspace.key === selectedWorkspaceKey &&
          (workspace.kind === 'organization' || workspace.kind === 'fundraising')
      )
    : null
  const organizationId = selectedWorkspace?.workspaceId?.trim() || ''

  if (!organizationId) {
    return {
      status: 'error',
      message: 'Choose an Organization workspace to view payout status.',
    }
  }

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('membership_role, status')
    .eq('organization_id', organizationId)
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
      'onboarding_status, payouts_enabled, details_submitted, charges_enabled, livemode, disabled_reason, requirements_currently_due'
    )
    .eq('organization_id', organizationId)
    .maybeSingle()) as {
    data: StripeAccountRow | null
    error: { message: string } | null
  }

  if (error) {
    console.error('Organization Stripe status lookup failed', {
      organizationId,
      error,
    })

    return {
      status: 'error',
      message: 'RaiseHub could not load the current payout status.',
    }
  }

  const expectedLivemode = process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_live_') ?? false
  const readiness = evaluateOrganizationPayoutReadiness({
    accountExists: Boolean(data),
    expectedLivemode,
    livemode: data?.livemode ?? null,
    onboardingStatus: data?.onboarding_status ?? 'not_started',
    detailsSubmitted: data?.details_submitted ?? false,
    payoutsEnabled: data?.payouts_enabled ?? false,
    disabledReason: data?.disabled_reason ?? null,
    requirementsCurrentlyDue: data?.requirements_currently_due ?? null,
  })

  return {
    status: 'ok',
    organizationId,
    onboardingStatus: data?.onboarding_status ?? 'not_started',
    payoutsEnabled: data?.payouts_enabled ?? false,
    detailsSubmitted: data?.details_submitted ?? false,
    chargesEnabled: data?.charges_enabled ?? false,
    livemode: data?.livemode ?? null,
    payoutReady: readiness.ready,
    mode: readiness.mode,
    blockers: readiness.blockers.map((blocker) => blocker.message),
  }
}
