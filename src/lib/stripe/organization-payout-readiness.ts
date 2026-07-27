import type { CampaignPublishingBlocker } from '@/lib/campaign-publishing/types'

export type OrganizationPayoutReadinessInput = {
  accountExists: boolean
  expectedLivemode: boolean
  livemode: boolean | null
  onboardingStatus: string | null | undefined
  detailsSubmitted: boolean
  payoutsEnabled: boolean
  disabledReason: string | null | undefined
  requirementsCurrentlyDue: unknown
}

export type OrganizationPayoutReadiness = {
  ready: boolean
  mode: 'test' | 'live'
  blockers: CampaignPublishingBlocker[]
}

function hasOutstandingRequirements(value: unknown) {
  return Array.isArray(value) && value.length > 0
}

export function evaluateOrganizationPayoutReadiness(
  input: OrganizationPayoutReadinessInput
): OrganizationPayoutReadiness {
  const blockers: CampaignPublishingBlocker[] = []

  if (!input.accountExists) {
    blockers.push({
      code: 'stripe_account_missing',
      message: 'Set up a Stripe payout account before publishing.',
      action: 'complete_payout_setup',
    })
  } else {
    if (input.livemode !== null && input.livemode !== input.expectedLivemode) {
      blockers.push({
        code: 'stripe_mode_mismatch',
        message: input.expectedLivemode
          ? 'Complete payout setup with a live Stripe account before publishing.'
          : 'Reconnect the Stripe test account used by this environment.',
        action: 'complete_payout_setup',
      })
    }

    if (input.onboardingStatus !== 'enabled') {
      blockers.push({
        code: 'stripe_onboarding_incomplete',
        message: 'Complete Stripe onboarding before publishing.',
        action: 'complete_payout_setup',
      })
    }

    if (!input.detailsSubmitted) {
      blockers.push({
        code: 'stripe_details_incomplete',
        message: 'Submit the required Stripe account details before publishing.',
        action: 'complete_payout_setup',
      })
    }

    if (!input.payoutsEnabled) {
      blockers.push({
        code: 'stripe_payouts_disabled',
        message: 'Stripe payouts must be enabled before publishing.',
        action: 'complete_payout_setup',
      })
    }

    if (input.disabledReason) {
      blockers.push({
        code: 'stripe_account_disabled',
        message: `Stripe has restricted this payout account: ${input.disabledReason}.`,
        action: 'complete_payout_setup',
      })
    }

    if (hasOutstandingRequirements(input.requirementsCurrentlyDue)) {
      blockers.push({
        code: 'stripe_requirements_due',
        message: 'Stripe requires additional account information before payouts can be enabled.',
        action: 'complete_payout_setup',
      })
    }
  }

  return {
    ready: blockers.length === 0,
    mode: input.expectedLivemode ? 'live' : 'test',
    blockers,
  }
}
