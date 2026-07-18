import type { SellableCampaignOption } from '../types/campaigns'

// =============================================================================
// Campaign source contract
// =============================================================================

/**
 * Campaign fields required to build a public sellable campaign option.
 *
 * Pricing is deliberately excluded. Listing prices must be supplied through
 * effectivePassPrice after server-side managed-pricing resolution.
 */
export type SellableCampaignSource = {
  id: string
  organization_id: string
  name: string
  description: string | null
  goal_amount: number | null
  starts_at: string | null
  ends_at: string | null
  status: string
  created_at: string
}

// =============================================================================
// Payment progress rules
// =============================================================================

const INVALID_PROGRESS_PAYMENT_STATUSES = new Set([
  'failed',
  'cancelled',
  'canceled',
  'refunded',
  'disputed',
  'chargeback',
  'pending',
  'processing',
  'requires_action',
  'requires_payment_method',
  'incomplete',
  'expired',
  'voided',
])

const EXPLICIT_VALID_PROGRESS_PAYMENT_STATUSES = new Set([
  'test_paid',
  'paid',
  'succeeded',
  'completed',
  'captured',
  'settled',
])

function normalizePaymentStatus(
  paymentStatus: string | null | undefined
) {
  return (
    paymentStatus
      ?.trim()
      .toLowerCase() ?? ''
  )
}

export function isCampaignPurchaseProgressEligible(
  paymentStatus: string | null | undefined
): boolean {
  const normalizedStatus =
    normalizePaymentStatus(
      paymentStatus
    )

  if (!normalizedStatus) {
    return false
  }

  if (
    INVALID_PROGRESS_PAYMENT_STATUSES.has(
      normalizedStatus
    )
  ) {
    return false
  }

  return EXPLICIT_VALID_PROGRESS_PAYMENT_STATUSES.has(
    normalizedStatus
  )
}

// =============================================================================
// Shared normalization
// =============================================================================

function getValidDate(
  value: string | null | undefined
): Date | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? null
    : date
}

function normalizePassPrice(
  value:
    | number
    | string
    | null
    | undefined
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const normalizedValue =
    Number(value)

  if (
    !Number.isFinite(
      normalizedValue
    ) ||
    normalizedValue <= 0
  ) {
    return null
  }

  return normalizedValue
}

// =============================================================================
// Goal progress calculations
// =============================================================================

export function calculateGoalPercentage(
  amountRaised: number,
  goalAmount:
    | number
    | null
    | undefined
): number | null {
  const normalizedGoal = Number(
    goalAmount ?? 0
  )

  if (normalizedGoal <= 0) {
    return null
  }

  return Math.min(
    (amountRaised /
      normalizedGoal) *
      100,
    100
  )
}

export function calculateAmountRemaining(
  amountRaised: number,
  goalAmount:
    | number
    | null
    | undefined
): number | null {
  const normalizedGoal = Number(
    goalAmount ?? 0
  )

  if (normalizedGoal <= 0) {
    return null
  }

  return Math.max(
    normalizedGoal -
      amountRaised,
    0
  )
}

export type CampaignDetailProgressState =
  | {
      status: 'available'
      amountRaised: number
      goalPercentage: number
      amountRemaining:
        | number
        | null
    }
  | {
      status: 'unavailable'
    }

export function buildCampaignDetailProgressState(
  input: {
    amountRaised:
      | number
      | null
      | undefined
    goalAmount:
      | number
      | null
      | undefined
    unavailable?: boolean
  }
): CampaignDetailProgressState {
  if (input.unavailable) {
    return {
      status: 'unavailable',
    }
  }

  const amountRaised = Number(
    input.amountRaised ?? 0
  )

  return {
    status: 'available',
    amountRaised,
    goalPercentage:
      calculateGoalPercentage(
        amountRaised,
        input.goalAmount
      ) ?? 0,
    amountRemaining:
      calculateAmountRemaining(
        amountRaised,
        input.goalAmount
      ),
  }
}

// =============================================================================
// Campaign timing
// =============================================================================

export function calculateDaysRemaining(
  endsAt:
    | string
    | null
    | undefined,
  now = new Date()
): number | null {
  const endDate =
    getValidDate(endsAt)

  if (!endDate) {
    return null
  }

  const differenceMs =
    endDate.getTime() -
    now.getTime()

  if (differenceMs <= 0) {
    return 0
  }

  return Math.ceil(
    differenceMs /
      (24 * 60 * 60 * 1000)
  )
}

// =============================================================================
// Sellable campaign mapping
// =============================================================================

export function buildSellableCampaignOption(
  input: {
    campaign: SellableCampaignSource
    organizationId:
      | string
      | null
    organizationName:
      | string
      | null
    imageUrl:
      | string
      | null
    amountRaised: number

    /**
     * Server-resolved managed price for this campaign.
     *
     * Every campaign loader must provide this property. Invalid or missing
     * resolver output produces no displayed price rather than falling back to
     * campaigns.pass_price.
     */
    effectivePassPrice:
      | number
      | null
      | undefined

    now?: Date
  }
): SellableCampaignOption {
  const goalAmount =
    input.campaign
      .goal_amount === null
      ? null
      : Number(
          input.campaign
            .goal_amount
        )

  const effectivePassPrice =
    normalizePassPrice(
      input.effectivePassPrice
    )

  return {
    id: input.campaign.id,
    organizationId:
      input.organizationId,
    organizationLegacyProfileId:
      input.campaign
        .organization_id,
    name: input.campaign.name,
    organizationName:
      input.organizationName,
    imageUrl: input.imageUrl,
    amountRaised:
      input.amountRaised,
    goalAmount,
    goalPercentage:
      calculateGoalPercentage(
        input.amountRaised,
        goalAmount
      ),
    amountRemaining:
      calculateAmountRemaining(
        input.amountRaised,
        goalAmount
      ),
    endsAt:
      input.campaign.ends_at,
    daysRemaining:
      calculateDaysRemaining(
        input.campaign.ends_at,
        input.now
      ),
    createdAt:
      input.campaign.created_at,
    passPrice:
      effectivePassPrice,
    description:
      input.campaign.description,
    startsAt:
      input.campaign.starts_at,
    status:
      input.campaign.status,
  }
}

// =============================================================================
// Campaign ordering
// =============================================================================

export function compareSellableCampaignOptions(
  left: Pick<
    SellableCampaignOption,
    | 'endsAt'
    | 'goalPercentage'
    | 'createdAt'
    | 'name'
  >,
  right: Pick<
    SellableCampaignOption,
    | 'endsAt'
    | 'goalPercentage'
    | 'createdAt'
    | 'name'
  >
): number {
  const leftEndDate =
    getValidDate(left.endsAt)

  const rightEndDate =
    getValidDate(right.endsAt)

  if (
    leftEndDate &&
    rightEndDate
  ) {
    const endDifference =
      leftEndDate.getTime() -
      rightEndDate.getTime()

    if (endDifference !== 0) {
      return endDifference
    }
  } else if (
    leftEndDate ||
    rightEndDate
  ) {
    return leftEndDate
      ? -1
      : 1
  }

  const leftProgress =
    left.goalPercentage ?? -1

  const rightProgress =
    right.goalPercentage ?? -1

  if (
    leftProgress !==
    rightProgress
  ) {
    return (
      rightProgress -
      leftProgress
    )
  }

  const leftCreatedAt =
    getValidDate(
      left.createdAt
    )?.getTime() ?? 0

  const rightCreatedAt =
    getValidDate(
      right.createdAt
    )?.getTime() ?? 0

  if (
    leftCreatedAt !==
    rightCreatedAt
  ) {
    return (
      leftCreatedAt -
      rightCreatedAt
    )
  }

  return left.name.localeCompare(
    right.name,
    undefined,
    {
      sensitivity: 'base',
    }
  )
}
