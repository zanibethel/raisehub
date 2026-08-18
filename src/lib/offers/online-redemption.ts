export const OFFER_REDEMPTION_CHANNELS = [
  'in_person',
  'online',
  'both',
] as const

export type OfferRedemptionChannel =
  (typeof OFFER_REDEMPTION_CHANNELS)[number]

export type OnlineRedemptionInput = {
  redemptionChannel: unknown
  onlineStoreUrl?: unknown
  discountCode?: unknown
  discountUrl?: unknown
  onlineRedemptionInstructions?: unknown
}

export type NormalizedOnlineRedemption = {
  redemptionChannel: OfferRedemptionChannel
  onlineStoreUrl: string | null
  discountCode: string | null
  discountUrl: string | null
  onlineRedemptionInstructions: string | null
}

export type OnlineRedemptionValidationResult =
  | { ok: true; value: NormalizedOnlineRedemption }
  | { ok: false; error: string }

export function isOfferRedemptionChannel(
  value: unknown
): value is OfferRedemptionChannel {
  return (
    typeof value === 'string' &&
    OFFER_REDEMPTION_CHANNELS.includes(value as OfferRedemptionChannel)
  )
}

function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim()
  if (!normalized) return null

  return normalized.slice(0, maxLength)
}

export function normalizeOnlineOfferUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const url = new URL(candidate)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname || url.username || url.password) return null

    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function normalizeDiscountCode(value: unknown): string | null {
  const code = normalizeOptionalText(value, 100)
  if (!code) return null

  return code.replace(/\s+/g, ' ')
}

export function validateOnlineRedemptionInput(
  input: OnlineRedemptionInput
): OnlineRedemptionValidationResult {
  if (!isOfferRedemptionChannel(input.redemptionChannel)) {
    return { ok: false, error: 'Choose where customers can use this offer.' }
  }

  const onlineStoreUrl = normalizeOnlineOfferUrl(input.onlineStoreUrl)
  const discountUrl = normalizeOnlineOfferUrl(input.discountUrl)
  const discountCode = normalizeDiscountCode(input.discountCode)
  const onlineRedemptionInstructions = normalizeOptionalText(
    input.onlineRedemptionInstructions,
    1000
  )

  const rawStoreUrl = normalizeOptionalText(input.onlineStoreUrl, 2048)
  const rawDiscountUrl = normalizeOptionalText(input.discountUrl, 2048)

  if (rawStoreUrl && !onlineStoreUrl) {
    return { ok: false, error: 'Enter a valid online store URL.' }
  }

  if (rawDiscountUrl && !discountUrl) {
    return { ok: false, error: 'Enter a valid discount link.' }
  }

  const supportsOnline =
    input.redemptionChannel === 'online' || input.redemptionChannel === 'both'

  if (supportsOnline && !onlineStoreUrl && !discountUrl) {
    return {
      ok: false,
      error: 'Online offers need a store URL or a discount link.',
    }
  }

  return {
    ok: true,
    value: {
      redemptionChannel: input.redemptionChannel,
      onlineStoreUrl: supportsOnline ? onlineStoreUrl : null,
      discountCode: supportsOnline ? discountCode : null,
      discountUrl: supportsOnline ? discountUrl : null,
      onlineRedemptionInstructions: supportsOnline
        ? onlineRedemptionInstructions
        : null,
    },
  }
}

export function getOnlineOfferDestination(
  offer: Pick<NormalizedOnlineRedemption, 'discountUrl' | 'onlineStoreUrl'>
): string | null {
  return offer.discountUrl ?? offer.onlineStoreUrl
}
