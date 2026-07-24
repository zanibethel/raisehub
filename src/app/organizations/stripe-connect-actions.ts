'use server'

import { headers } from 'next/headers'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe/server'

type ConnectResult =
  | { status: 'onboarding-ready'; url: string }
  | { status: 'error'; message: string }

type OrganizationRow = {
  id: string
  name: string
  email: string | null
}

type StripeAccountRow = {
  stripe_account_id: string
}

type OrganizationMembershipRow = {
  organization_id: string
}

async function resolveOrigin() {
  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin')?.trim()

  if (origin) return origin.replace(/\/$/, '')

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`

  return 'http://localhost:3000'
}

function onboardingStatus(account: {
  details_submitted?: boolean | null
  charges_enabled?: boolean | null
  payouts_enabled?: boolean | null
  requirements?: { disabled_reason?: string | null } | null
}) {
  if (account.charges_enabled && account.payouts_enabled) return 'enabled'
  if (account.requirements?.disabled_reason) return 'restricted'
  if (account.details_submitted) return 'in_progress'
  return 'not_started'
}

export async function startOrganizationStripeOnboardingAction(
  organizationId: string
): Promise<ConnectResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: 'error', message: 'Log in before connecting payouts.' }
  }

  let cleanOrganizationId = organizationId.trim()

  if (!cleanOrganizationId) {
    const { data: legacyOrganization } = await supabase
      .from('organizations')
      .select('id')
      .eq('legacy_profile_id', user.id)
      .maybeSingle<{ id: string }>()

    cleanOrganizationId = legacyOrganization?.id ?? ''
  }

  if (!cleanOrganizationId) {
    const { data: memberships } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('membership_role', ['admin', 'manager'])
      .limit(2)

    const eligibleMemberships = (memberships ?? []) as OrganizationMembershipRow[]

    if (eligibleMemberships.length === 1) {
      cleanOrganizationId = eligibleMemberships[0].organization_id
    }
  }

  if (!cleanOrganizationId) {
    return {
      status: 'error',
      message: 'Choose an Organization workspace, then try payout setup again.',
    }
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
      message: 'You do not have permission to manage payouts for this organization.',
    }
  }

  const admin = createAdminClient()
  const untypedAdmin = admin as any
  const { data: organization, error: organizationError } = await admin
    .from('organizations')
    .select('id, name, email')
    .eq('id', cleanOrganizationId)
    .maybeSingle<OrganizationRow>()

  if (organizationError || !organization) {
    return { status: 'error', message: 'Organization workspace was not found.' }
  }

  const { data: existingAccount, error: existingAccountError } = await untypedAdmin
    .from('organization_stripe_accounts')
    .select('stripe_account_id')
    .eq('organization_id', organization.id)
    .maybeSingle() as { data: StripeAccountRow | null; error: { message: string } | null }

  if (existingAccountError) {
    return { status: 'error', message: 'We could not check payout setup.' }
  }

  try {
    const stripe = getStripeClient()
    let accountId = existingAccount?.stripe_account_id ?? null

    if (!accountId) {
      const account = await stripe.accounts.create(
        {
          type: 'express',
          country: 'US',
          email: organization.email ?? user.email ?? undefined,
          business_profile: {
            name: organization.name,
            product_description: 'Fundraising proceeds distributed through RaiseHub',
          },
          capabilities: {
            transfers: { requested: true },
          },
          metadata: {
            raisehub_organization_id: organization.id,
          },
        },
        {
          idempotencyKey: `raisehub-connect-account-${organization.id}`,
        }
      )

      accountId = account.id
      const { error: insertError } = await untypedAdmin
        .from('organization_stripe_accounts')
        .insert({
          organization_id: organization.id,
          stripe_account_id: account.id,
          livemode: false,
          onboarding_status: onboardingStatus(account),
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements_currently_due: account.requirements?.currently_due ?? [],
          requirements_eventually_due: account.requirements?.eventually_due ?? [],
          requirements_past_due: account.requirements?.past_due ?? [],
          disabled_reason: account.requirements?.disabled_reason ?? null,
          country: account.country ?? null,
          default_currency: account.default_currency ?? null,
          last_synced_at: new Date().toISOString(),
        })

      if (insertError) throw new Error(insertError.message)
    }

    const origin = await resolveOrigin()
    const workspaceQuery = `workspace=${encodeURIComponent(`organization:${organization.id}`)}`
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${origin}/dashboard?${workspaceQuery}&connect=refresh`,
      return_url: `${origin}/dashboard?${workspaceQuery}&connect=return`,
    })

    await untypedAdmin
      .from('organization_stripe_accounts')
      .update({
        onboarding_status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organization.id)

    return { status: 'onboarding-ready', url: accountLink.url }
  } catch (error) {
    console.error('Stripe Connect onboarding could not start', error)
    return {
      status: 'error',
      message: 'Stripe payout setup could not be opened. Please try again.',
    }
  }
}
