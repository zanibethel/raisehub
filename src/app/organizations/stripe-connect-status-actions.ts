'use server'

import { cookies } from 'next/headers'
import type Stripe from 'stripe'

import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { evaluateOrganizationPayoutReadiness } from '@/lib/stripe/organization-payout-readiness'
import { getStripeClient } from '@/lib/stripe/server'
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
  stripe_account_id: string
  onboarding_status: string
  payouts_enabled: boolean
  details_submitted: boolean
  charges_enabled: boolean
  livemode: boolean
  disabled_reason: string | null
  requirements_currently_due: unknown
}

type OrganizationMembershipRow = {
  organization_id: string
}

function connectOnboardingStatus(account: Stripe.Account) {
  if (account.charges_enabled && account.payouts_enabled) return 'enabled'
  if (account.requirements?.disabled_reason) return 'restricted'
  if (account.details_submitted) return 'in_progress'
  return 'not_started'
}

async function refreshConnectedAccount(
  admin: any,
  row: StripeAccountRow
): Promise<StripeAccountRow> {
  if (!row.stripe_account_id?.startsWith('acct_')) return row

  try {
    const stripe = getStripeClient()
    const account = await stripe.accounts.retrieve(row.stripe_account_id)

    if ('deleted' in account && account.deleted) return row

    const expectedLivemode =
      process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_live_') ?? false
    const refreshed: StripeAccountRow = {
      stripe_account_id: account.id,
      onboarding_status: connectOnboardingStatus(account),
      payouts_enabled: Boolean(account.payouts_enabled),
      details_submitted: Boolean(account.details_submitted),
      charges_enabled: Boolean(account.charges_enabled),
      livemode: expectedLivemode,
      disabled_reason: account.requirements?.disabled_reason ?? null,
      requirements_currently_due: account.requirements?.currently_due ?? [],
    }

    const timestamp = new Date().toISOString()
    const { error } = await admin
      .from('organization_stripe_accounts')
      .update({
        livemode: refreshed.livemode,
        onboarding_status: refreshed.onboarding_status,
        details_submitted: refreshed.details_submitted,
        charges_enabled: refreshed.charges_enabled,
        payouts_enabled: refreshed.payouts_enabled,
        requirements_currently_due: refreshed.requirements_currently_due,
        requirements_eventually_due: account.requirements?.eventually_due ?? [],
        requirements_past_due: account.requirements?.past_due ?? [],
        disabled_reason: refreshed.disabled_reason,
        country: account.country ?? null,
        default_currency: account.default_currency ?? null,
        last_synced_at: timestamp,
        updated_at: timestamp,
      })
      .eq('stripe_account_id', row.stripe_account_id)

    if (error) {
      console.error('Organization Stripe direct refresh persistence failed', {
        stripeAccountId: row.stripe_account_id,
        error,
      })
      return refreshed
    }

    return refreshed
  } catch (error) {
    console.error('Organization Stripe direct refresh failed', {
      stripeAccountId: row.stripe_account_id,
      error,
    })
    return row
  }
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

  let organizationId = selectedWorkspace?.workspaceId?.trim() || ''

  if (!organizationId) {
    const { data: memberships } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('membership_role', ['admin', 'manager'])
      .limit(2)

    const eligibleMemberships = (memberships ?? []) as OrganizationMembershipRow[]

    if (eligibleMemberships.length === 1) {
      organizationId = eligibleMemberships[0].organization_id
    }
  }

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
      'stripe_account_id, onboarding_status, payouts_enabled, details_submitted, charges_enabled, livemode, disabled_reason, requirements_currently_due'
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

  const currentData = data ? await refreshConnectedAccount(admin, data) : null
  const expectedLivemode =
    process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_live_') ?? false
  const readiness = evaluateOrganizationPayoutReadiness({
    accountExists: Boolean(currentData),
    expectedLivemode,
    livemode: currentData?.livemode ?? null,
    onboardingStatus: currentData?.onboarding_status ?? 'not_started',
    detailsSubmitted: currentData?.details_submitted ?? false,
    payoutsEnabled: currentData?.payouts_enabled ?? false,
    disabledReason: currentData?.disabled_reason ?? null,
    requirementsCurrentlyDue: currentData?.requirements_currently_due ?? null,
  })

  return {
    status: 'ok',
    organizationId,
    onboardingStatus: currentData?.onboarding_status ?? 'not_started',
    payoutsEnabled: currentData?.payouts_enabled ?? false,
    detailsSubmitted: currentData?.details_submitted ?? false,
    chargesEnabled: currentData?.charges_enabled ?? false,
    livemode: currentData?.livemode ?? null,
    payoutReady: readiness.ready,
    mode: readiness.mode,
    blockers: readiness.blockers.map((blocker) => blocker.message),
  }
}
