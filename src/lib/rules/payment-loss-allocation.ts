export type PaymentLossAllocationInput = {
  amountPaid: number
  organizationEarnings: number
  cumulativeRefundedAmountCents: number
  previouslyAllocatedOrganizationLossCents?: number
}

export type PaymentLossAllocation = {
  targetOrganizationLossCents: number
  incrementalOrganizationLossCents: number
  remainingOrganizationEarningsCents: number
}

function toNonNegativeCents(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.round(value * 100)
}

/**
 * Allocates a cumulative Stripe refund to the organization without charging the
 * organization for RaiseHub's platform-fee share.
 *
 * Example: a $20 payment with $16 of organization earnings that is fully
 * refunded creates a $16 organization loss, not a $20 organization loss.
 */
export function calculateOrganizationRefundAllocation(
  input: PaymentLossAllocationInput
): PaymentLossAllocation {
  const totalPaidCents = toNonNegativeCents(input.amountPaid)
  const organizationEarningsCents = Math.min(
    toNonNegativeCents(input.organizationEarnings),
    totalPaidCents
  )
  const cumulativeRefundedCents = Math.min(
    Math.max(Math.trunc(input.cumulativeRefundedAmountCents), 0),
    totalPaidCents
  )
  const previousLossCents = Math.min(
    Math.max(Math.trunc(input.previouslyAllocatedOrganizationLossCents ?? 0), 0),
    organizationEarningsCents
  )

  if (totalPaidCents === 0 || organizationEarningsCents === 0) {
    return {
      targetOrganizationLossCents: 0,
      incrementalOrganizationLossCents: 0,
      remainingOrganizationEarningsCents: 0,
    }
  }

  const targetOrganizationLossCents = Math.min(
    organizationEarningsCents,
    Math.round(
      (organizationEarningsCents * cumulativeRefundedCents) / totalPaidCents
    )
  )

  return {
    targetOrganizationLossCents,
    incrementalOrganizationLossCents: Math.max(
      targetOrganizationLossCents - previousLossCents,
      0
    ),
    remainingOrganizationEarningsCents: Math.max(
      organizationEarningsCents - targetOrganizationLossCents,
      0
    ),
  }
}
