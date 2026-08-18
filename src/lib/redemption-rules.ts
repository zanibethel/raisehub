export const OFFER_USAGE_RULES = [
  'one-time',
  'daily',
  'weekly',
  'unlimited',
] as const

export type OfferUsageRule = (typeof OFFER_USAGE_RULES)[number]

export type RedemptionAvailability = {
  canRedeem: boolean
  nextAvailableAt: string | null
  label: string
}

export function isOfferUsageRule(value: unknown): value is OfferUsageRule {
  return OFFER_USAGE_RULES.includes(value as OfferUsageRule)
}

export function getOfferUsageRuleLabel(rule: OfferUsageRule): string {
  switch (rule) {
    case 'one-time':
      return 'Single use'
    case 'daily':
      return 'Once every 24 hours'
    case 'weekly':
      return 'Once every 7 days'
    case 'unlimited':
      return 'Reusable anytime'
  }
}

export function inferOfferUsageRuleFromDescription(
  description: string
): OfferUsageRule {
  if (description.includes('once every 24 hours per member')) {
    return 'daily'
  }

  if (description.includes('once every 7 days per member')) {
    return 'weekly'
  }

  if (description.includes('Reusable while this offer remains active')) {
    return 'unlimited'
  }

  return 'one-time'
}

export function getRedemptionAvailability({
  usageRule,
  lastRedeemedAt,
  now = new Date(),
}: {
  usageRule: string | null | undefined
  lastRedeemedAt?: string | null
  now?: Date
}): RedemptionAvailability {
  const rule: OfferUsageRule = isOfferUsageRule(usageRule)
    ? usageRule
    : 'one-time'

  if (!lastRedeemedAt) {
    return {
      canRedeem: true,
      nextAvailableAt: null,
      label: 'Ready to use',
    }
  }

  const lastTimestamp = new Date(lastRedeemedAt).getTime()
  if (Number.isNaN(lastTimestamp)) {
    return {
      canRedeem: rule !== 'one-time',
      nextAvailableAt: null,
      label: rule === 'one-time' ? 'Already used' : 'Ready to use again',
    }
  }

  if (rule === 'one-time') {
    return {
      canRedeem: false,
      nextAvailableAt: null,
      label: 'Already used',
    }
  }

  if (rule === 'unlimited') {
    return {
      canRedeem: true,
      nextAvailableAt: null,
      label: 'Ready to use again',
    }
  }

  const waitMs = rule === 'daily'
    ? 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000
  const nextTimestamp = lastTimestamp + waitMs

  if (now.getTime() >= nextTimestamp) {
    return {
      canRedeem: true,
      nextAvailableAt: null,
      label: 'Ready to use again',
    }
  }

  return {
    canRedeem: false,
    nextAvailableAt: new Date(nextTimestamp).toISOString(),
    label: rule === 'daily'
      ? 'Available again after 24 hours'
      : 'Available again after 7 days',
  }
}
