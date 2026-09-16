import 'server-only'

import { headers } from 'next/headers'
import type Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type BusinessPayoutStatus = {
  businessId: string
  isDemo: boolean
  accountExists: boolean
  onboardingStatus: string
  detailsSubmitted: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  livemode: boolean | null
  payoutReady: boolean
  mode: 'test' | 'live'
  blockers: string[]
  lastSyncedAt: string | null
}

type BusinessRow = {
  id: string
  name: string
  email: string | null
  is_demo: boolean
}

type StripeAccountRow = {
  stripe_account_id: string
  onboarding_status: string
  payouts_enabled: boolean
  details_submitted: boolean
  charges_enabled: boolean
  livemode: boolean
  disabled_reason: string | null
  requirements_currently_due: unknown
  last_synced_at: string | null
}

function isLiveStripeEnvironment() {
  return process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_live_') ?? false
}

async function resolveOrigin() {
  if (isLiveStripeEnvironment()) return 'https://www.raisehub.app'

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')

  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin')?.trim()
  if (origin) return origin.replace(/\/$/, '')

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`

  return 'http://localhost:3000'
}

function onboardingStatus(account: Stripe.Account) {
  if (account.charges_enabled && account.payouts_enabled) return 'enabled'
  if (account.requirements?.disabled_reason) return 'restricted'
  if (account.details_submitted) return 'in_progress'
  return 'not_started'
}

function readiness(input: {
  accountExists: boolean
  expectedLivemode: boolean
  livemode: boolean | null
  onboardingStatus: string
  detailsSubmitted: boolean
  payoutsEnabled: boolean
  disabledReason: string | null
  requirementsCurrentlyDue: unknown
}) {
  const blockers: string[] = []

  if (!input.accountExists) {
    blockers.push('Connect a Stripe payout account before a cash Partner Reward can be paid.')
  } else {
    if (input.livemode !== null && input.livemode !== input.expectedLivemode) {
      blockers.push(
        input.expectedLivemode
          ? 'Complete payout setup with a live Stripe account.'
          : 'Reconnect the Stripe test account used by this environment.'
      )
    }
    if (input.onboardingStatus !== 'enabled') {
      blockers.push('Complete Stripe onboarding before cash payouts can be enabled.')
    }
    if (!input.detailsSubmitted) {
      blockers.push('Submit the required Stripe account details.')
    }
    if (!input.payoutsEnabled) {
      blockers.push('Stripe payouts are not enabled yet.')
    }
    if (input.disabledReason) {
      blockers.push(`Stripe has restricted this payout account: ${input.disabledReason}.`)
    }
    if (Array.isArray(input.requirementsCurrentlyDue) && input.requirementsCurrentlyDue.length > 0) {
      blockers.push('Stripe requires additional account information.')
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
    mode: input.expectedLivemode ? ('live' as const) : ('test' as const),
  }
}

async function loadBusiness(businessId: string): Promise<BusinessRow | null> {
  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('businesses')
    .select('id, name, email, is_demo')
    .eq('id', businessId)
    .maybeSingle()

  if (error) throw error
  return (data as BusinessRow | null) ?? null
}

async function canManageBusiness(businessId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { allowed: false as const, user: null }

  const { data: membership } = await supabase
    .from('business_memberships')
    .select('membership_role, status')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('membership_role', ['owner', 'manager'])
    .maybeSingle()

  return { allowed: Boolean(membership), user }
}

async function refreshAccount(row: StripeAccountRow) {
  if (!row.stripe_account_id?.startsWith('acct_')) return row

  try {
    const stripe = getStripeClient()
    const account = await stripe.accounts.retrieve(row.stripe_account_id)
    if ('deleted' in account && account.deleted) return row

    const expectedLivemode = isLiveStripeEnvironment()
    const refreshed: StripeAccountRow = {
      stripe_account_id: account.id,
      onboarding_status: onboardingStatus(account),
      payouts_enabled: Boolean(account.payouts_enabled),
      details_submitted: Boolean(account.details_submitted),
      charges_enabled: Boolean(account.charges_enabled),
      livemode: expectedLivemode,
      disabled_reason: account.requirements?.disabled_reason ?? null,
      requirements_currently_due: account.requirements?.currently_due ?? [],
      last_synced_at: new Date().toISOString(),
    }

    const admin = createAdminClient() as any
    await admin
      .from('business_stripe_accounts')
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
        last_synced_at: refreshed.last_synced_at,
        updated_at: refreshed.last_synced_at,
      })
      .eq('stripe_account_id', row.stripe_account_id)

    return refreshed
  } catch (error) {
    console.error('Business Stripe account refresh failed', {
      stripeAccountId: row.stripe_account_id,
      error,
    })
    return row
  }
}

export async function getBusinessPayoutStatus(
  businessId: string | null,
  options: { refreshStripe?: boolean } = {}
): Promise<BusinessPayoutStatus | null> {
  if (!businessId) return null

  const business = await loadBusiness(businessId)
  if (!business) return null

  const expectedLivemode = isLiveStripeEnvironment()
  if (business.is_demo) {
    return {
      businessId,
      isDemo: true,
      accountExists: false,
      onboardingStatus: 'demo',
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      livemode: null,
      payoutReady: false,
      mode: expectedLivemode ? 'live' : 'test',
      blockers: ['Demo businesses do not create real Stripe payout accounts.'],
      lastSyncedAt: null,
    }
  }

  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('business_stripe_accounts')
    .select('stripe_account_id, onboarding_status, payouts_enabled, details_submitted, charges_enabled, livemode, disabled_reason, requirements_currently_due, last_synced_at')
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) throw error

  let account = (data as StripeAccountRow | null) ?? null
  if (account && options.refreshStripe) account = await refreshAccount(account)

  const evaluated = readiness({
    accountExists: Boolean(account),
    expectedLivemode,
    livemode: account?.livemode ?? null,
    onboardingStatus: account?.onboarding_status ?? 'not_started',
    detailsSubmitted: account?.details_submitted ?? false,
    payoutsEnabled: account?.payouts_enabled ?? false,
    disabledReason: account?.disabled_reason ?? null,
    requirementsCurrentlyDue: account?.requirements_currently_due ?? null,
  })

  return {
    businessId,
    isDemo: false,
    accountExists: Boolean(account),
    onboardingStatus: account?.onboarding_status ?? 'not_started',
    detailsSubmitted: account?.details_submitted ?? false,
    chargesEnabled: account?.charges_enabled ?? false,
    payoutsEnabled: account?.payouts_enabled ?? false,
    livemode: account?.livemode ?? null,
    payoutReady: evaluated.ready,
    mode: evaluated.mode,
    blockers: evaluated.blockers,
    lastSyncedAt: account?.last_synced_at ?? null,
  }
}

export async function startBusinessStripeOnboarding(
  businessId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const cleanBusinessId = businessId.trim()
  if (!cleanBusinessId) return { ok: false, error: 'Business workspace was not found.' }

  const permission = await canManageBusiness(cleanBusinessId)
  if (!permission.allowed || !permission.user) {
    return { ok: false, error: 'Only a business owner or manager can manage payout setup.' }
  }

  const business = await loadBusiness(cleanBusinessId)
  if (!business) return { ok: false, error: 'Business workspace was not found.' }
  if (business.is_demo) {
    return { ok: false, error: 'Stripe payout setup is disabled for demo businesses.' }
  }

  const admin = createAdminClient() as any
  const { data: existing, error: existingError } = await admin
    .from('business_stripe_accounts')
    .select('stripe_account_id')
    .eq('business_id', business.id)
    .maybeSingle()

  if (existingError) return { ok: false, error: 'RaiseHub could not check payout setup.' }

  try {
    const stripe = getStripeClient()
    const liveMode = isLiveStripeEnvironment()
    let accountId = existing?.stripe_account_id ?? null

    if (!accountId) {
      const account = await stripe.accounts.create(
        {
          type: 'express',
          country: 'US',
          email: business.email ?? permission.user.email ?? undefined,
          business_profile: {
            name: business.name,
            product_description: 'Local business Partner Rewards distributed through RaiseHub',
          },
          capabilities: {
            transfers: { requested: true },
          },
          metadata: {
            raisehub_business_id: business.id,
            raisehub_account_purpose: 'partner_rewards',
          },
        },
        { idempotencyKey: `raisehub-business-connect-v1-${business.id}` }
      )

      accountId = account.id
      const { error: insertError } = await admin
        .from('business_stripe_accounts')
        .insert({
          business_id: business.id,
          stripe_account_id: account.id,
          livemode: liveMode,
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
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${origin}/dashboard/rewards?connect=refresh`,
      return_url: `${origin}/dashboard/rewards?connect=return`,
    })

    await admin
      .from('business_stripe_accounts')
      .update({
        onboarding_status: 'in_progress',
        livemode: liveMode,
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', business.id)

    return { ok: true, url: accountLink.url }
  } catch (error) {
    console.error('Business Stripe Connect onboarding could not start', {
      businessId: business.id,
      error,
    })

    const message = error instanceof Error ? error.message : ''
    if (message.includes("only create new accounts if you've signed up for Connect")) {
      return {
        ok: false,
        error: 'Stripe Connect is not fully enabled for this RaiseHub account yet.',
      }
    }
    if (message.includes('STRIPE_SECRET_KEY is not configured')) {
      return { ok: false, error: 'Stripe credentials are not configured for this deployment.' }
    }

    return { ok: false, error: 'Stripe payout setup could not be opened. Please try again.' }
  }
}
