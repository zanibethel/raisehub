import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateOrganizationRefundAllocation } from './payment-loss-allocation'

test('full refund allocates only the organization earnings share', () => {
  assert.deepEqual(
    calculateOrganizationRefundAllocation({
      amountPaid: 20,
      organizationEarnings: 16,
      cumulativeRefundedAmountCents: 2000,
    }),
    {
      targetOrganizationLossCents: 1600,
      incrementalOrganizationLossCents: 1600,
      remainingOrganizationEarningsCents: 0,
    }
  )
})

test('partial refund allocates the organization share proportionally', () => {
  assert.deepEqual(
    calculateOrganizationRefundAllocation({
      amountPaid: 20,
      organizationEarnings: 16,
      cumulativeRefundedAmountCents: 500,
    }),
    {
      targetOrganizationLossCents: 400,
      incrementalOrganizationLossCents: 400,
      remainingOrganizationEarningsCents: 1200,
    }
  )
})

test('repeated cumulative refund events only allocate the new difference', () => {
  assert.deepEqual(
    calculateOrganizationRefundAllocation({
      amountPaid: 20,
      organizationEarnings: 16,
      cumulativeRefundedAmountCents: 1000,
      previouslyAllocatedOrganizationLossCents: 400,
    }),
    {
      targetOrganizationLossCents: 800,
      incrementalOrganizationLossCents: 400,
      remainingOrganizationEarningsCents: 800,
    }
  )
})

test('allocation is capped at the original organization earnings', () => {
  assert.deepEqual(
    calculateOrganizationRefundAllocation({
      amountPaid: 20,
      organizationEarnings: 16,
      cumulativeRefundedAmountCents: 999999,
    }),
    {
      targetOrganizationLossCents: 1600,
      incrementalOrganizationLossCents: 1600,
      remainingOrganizationEarningsCents: 0,
    }
  )
})
