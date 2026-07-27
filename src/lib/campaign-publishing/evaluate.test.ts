import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateCampaignPublishingEligibility } from './evaluate'
import type { CampaignPublishingEligibilityInput } from './types'

function eligibleInput(
  overrides: Partial<CampaignPublishingEligibilityInput> = {}
): CampaignPublishingEligibilityInput {
  const base: CampaignPublishingEligibilityInput = {
    campaignId: 'campaign-1',
    campaignStatus: 'draft',
    reviewStatus: 'approved',
    authorized: true,
    profileReady: true,
    approvalCurrent: true,
    stripe: {
      accountExists: true,
      expectedLivemode: false,
      livemode: false,
      onboardingStatus: 'enabled',
      detailsSubmitted: true,
      payoutsEnabled: true,
      disabledReason: null,
      requirementsCurrentlyDue: [],
    },
  }

  return {
    ...base,
    ...overrides,
    stripe: {
      ...base.stripe,
      ...(overrides.stripe ?? {}),
    },
  }
}

function blockerCodes(input: CampaignPublishingEligibilityInput) {
  return evaluateCampaignPublishingEligibility(input).blockingReasons.map(
    (blocker) => blocker.code
  )
}

test('draft, review not submitted, payouts incomplete', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({
      reviewStatus: 'not_submitted',
      stripe: { payoutsEnabled: false } as CampaignPublishingEligibilityInput['stripe'],
    })
  )

  assert.equal(result.canPublish, false)
  assert.deepEqual(blockerCodes(eligibleInput({
    reviewStatus: 'not_submitted',
    stripe: { payoutsEnabled: false } as CampaignPublishingEligibilityInput['stripe'],
  })), ['review_not_submitted', 'stripe_payouts_disabled'])
  assert.equal(result.nextAction.code, 'submit_for_review')
})

test('draft, review pending, payouts ready', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({ reviewStatus: 'pending' })
  )

  assert.equal(result.canPublish, false)
  assert.equal(result.payoutsReady, true)
  assert.equal(result.nextAction.code, 'wait_for_review')
})

test('draft, review approved, profile incomplete', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({ profileReady: false })
  )

  assert.equal(result.canPublish, false)
  assert.deepEqual(blockerCodes(eligibleInput({ profileReady: false })), [
    'profile_incomplete',
  ])
  assert.equal(result.nextAction.code, 'complete_profile')
})

test('draft, review approved, payouts incomplete', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({
      stripe: { payoutsEnabled: false } as CampaignPublishingEligibilityInput['stripe'],
    })
  )

  assert.equal(result.canPublish, false)
  assert.equal(result.payoutsReady, false)
  assert.equal(result.nextAction.code, 'complete_payout_setup')
})

test('draft, review approved, profile and payouts ready', () => {
  const result = evaluateCampaignPublishingEligibility(eligibleInput())

  assert.equal(result.canPublish, true)
  assert.equal(result.nextAction.code, 'publish_campaign')
  assert.deepEqual(result.blockingReasons, [])
})

for (const status of ['active', 'paused', 'completed', 'archived']) {
  test(`${status} campaign is not publish eligible`, () => {
    const result = evaluateCampaignPublishingEligibility(
      eligibleInput({ campaignStatus: status })
    )

    assert.equal(result.canPublish, false)
    assert.equal(result.campaignStateReady, false)
    assert.ok(result.blockingReasons.some((blocker) => blocker.code === 'campaign_not_draft'))
  })
}

test('Stripe test-mode organization is eligible in test mode', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({
      stripe: {
        expectedLivemode: false,
        livemode: false,
      } as CampaignPublishingEligibilityInput['stripe'],
    })
  )

  assert.equal(result.canPublish, true)
})

test('Stripe production-mode organization is eligible in production mode', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({
      stripe: {
        expectedLivemode: true,
        livemode: true,
      } as CampaignPublishingEligibilityInput['stripe'],
    })
  )

  assert.equal(result.canPublish, true)
})

test('Stripe mode mismatch blocks publishing', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({
      stripe: {
        expectedLivemode: true,
        livemode: false,
      } as CampaignPublishingEligibilityInput['stripe'],
    })
  )

  assert.equal(result.canPublish, false)
  assert.ok(result.blockingReasons.some((blocker) => blocker.code === 'stripe_mode_mismatch'))
})

test('Stripe disabled reason blocks publishing and exposes the real reason', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({
      stripe: {
        disabledReason: 'requirements.past_due',
      } as CampaignPublishingEligibilityInput['stripe'],
    })
  )

  assert.equal(result.canPublish, false)
  const blocker = result.blockingReasons.find(
    (current) => current.code === 'stripe_account_disabled'
  )
  assert.match(blocker?.message ?? '', /requirements\.past_due/)
})

test('Stripe currently due requirements block publishing', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({
      stripe: {
        requirementsCurrentlyDue: ['representative.verification.document'],
      } as CampaignPublishingEligibilityInput['stripe'],
    })
  )

  assert.equal(result.canPublish, false)
  assert.ok(result.blockingReasons.some((blocker) => blocker.code === 'stripe_requirements_due'))
})

test('missing Stripe account reports setup blocker without duplicate Stripe blockers', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({
      stripe: {
        accountExists: false,
      } as CampaignPublishingEligibilityInput['stripe'],
    })
  )

  assert.deepEqual(
    result.blockingReasons.filter((blocker) => blocker.code.startsWith('stripe_')).map((blocker) => blocker.code),
    ['stripe_account_missing']
  )
})

test('unauthorized actor cannot publish an otherwise eligible campaign', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({ authorized: false })
  )

  assert.equal(result.canPublish, false)
  assert.equal(result.nextAction.code, 'contact_support')
})

test('material edit after approval invalidates publishing eligibility', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({ approvalCurrent: false })
  )

  assert.equal(result.canPublish, false)
  assert.equal(result.reviewReady, false)
  assert.ok(result.blockingReasons.some((blocker) => blocker.code === 'approval_invalidated'))
  assert.equal(result.nextAction.code, 'submit_for_review')
})

test('non-material edit preserves current approval', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({ approvalCurrent: true })
  )

  assert.equal(result.canPublish, true)
})

test('changes requested routes organizer back to campaign editing', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({ reviewStatus: 'changes_requested' })
  )

  assert.equal(result.canPublish, false)
  assert.equal(result.nextAction.code, 'update_campaign')
})

test('rejected and suspended reviews require support instead of publication', () => {
  for (const reviewStatus of ['rejected', 'suspended']) {
    const result = evaluateCampaignPublishingEligibility(
      eligibleInput({ reviewStatus })
    )

    assert.equal(result.canPublish, false)
    assert.equal(result.nextAction.code, 'contact_support')
  }
})

test('multiple blockers are all returned while next action remains deterministic', () => {
  const result = evaluateCampaignPublishingEligibility(
    eligibleInput({
      reviewStatus: 'not_submitted',
      profileReady: false,
      stripe: {
        onboardingStatus: 'in_progress',
        detailsSubmitted: false,
        payoutsEnabled: false,
      } as CampaignPublishingEligibilityInput['stripe'],
    })
  )

  assert.deepEqual(result.blockingReasons.map((blocker) => blocker.code), [
    'review_not_submitted',
    'profile_incomplete',
    'stripe_onboarding_incomplete',
    'stripe_details_incomplete',
    'stripe_payouts_disabled',
  ])
  assert.equal(result.nextAction.code, 'submit_for_review')
})
