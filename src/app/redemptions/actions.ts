'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

function friendlyError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('single-use offer has already been redeemed')) {
    return 'This single-use offer has already been redeemed.'
  }
  if (normalized.includes('once every 24 hours')) {
    return 'This offer becomes available again 24 hours after the last confirmed redemption.'
  }
  if (normalized.includes('once every 7 days')) {
    return 'This offer becomes available again 7 days after the last confirmed redemption.'
  }
  if (normalized.includes('active raisehub pass is required')) {
    return 'An active RaiseHub Pass is required to redeem this offer.'
  }
  if (
    normalized.includes('offer is paused') ||
    normalized.includes('offer has expired') ||
    normalized.includes('business is paused')
  ) {
    return 'This offer is not available for redemption right now.'
  }
  if (normalized.includes('code was not found')) {
    return 'That confirmation code was not found. Check the supporter’s screen and try again.'
  }
  if (normalized.includes('code has expired')) {
    return 'That confirmation code expired. Ask the supporter to generate a new code.'
  }
  if (normalized.includes('different business')) {
    return 'That confirmation code belongs to a different business.'
  }
  if (normalized.includes('business staff must be logged in')) {
    return 'Business staff must be logged in to confirm a redemption.'
  }
  if (normalized.includes('environment')) {
    return 'This redemption belongs to a different RaiseHub environment.'
  }

  return message || 'We could not complete the redemption. Please try again.'
}

export async function startRedemptionAction(offerId: string) {
  const normalizedOfferId = offerId.trim()
  if (!normalizedOfferId) {
    return { success: false as const, error: 'A valid offer is required.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: 'Please sign in before redeeming this offer.' }
  }

  const { data, error } = await (supabase as any).rpc('create_redemption_claim', {
    p_offer_id: normalizedOfferId,
  })

  if (error) {
    return { success: false as const, error: friendlyError(error.message) }
  }

  const claim = Array.isArray(data) ? data[0] : data
  if (!claim?.claim_id || !claim?.confirmation_code || !claim?.expires_at) {
    return { success: false as const, error: 'We could not create a confirmation code. Please try again.' }
  }

  return {
    success: true as const,
    claim: {
      id: String(claim.claim_id),
      code: String(claim.confirmation_code),
      expiresAt: String(claim.expires_at),
      status: String(claim.status ?? 'pending'),
    },
  }
}

export async function getRedemptionClaimStatusAction(claimId: string) {
  const normalizedClaimId = claimId.trim()
  if (!normalizedClaimId) {
    return { success: false as const, error: 'A valid redemption is required.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: 'Please sign in to check this redemption.' }
  }

  const { data, error } = await (supabase as any).rpc('get_redemption_claim_status', {
    p_claim_id: normalizedClaimId,
  })

  if (error) {
    return { success: false as const, error: friendlyError(error.message) }
  }

  const claim = Array.isArray(data) ? data[0] : data
  if (!claim?.status) {
    return { success: false as const, error: 'This redemption confirmation is no longer available.' }
  }

  return {
    success: true as const,
    status: String(claim.status),
    expiresAt: claim.expires_at ? String(claim.expires_at) : null,
    confirmedAt: claim.confirmed_at ? String(claim.confirmed_at) : null,
  }
}

export async function confirmRedemptionAction(confirmationCode: string) {
  const normalizedCode = confirmationCode.trim().toUpperCase()
  if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
    return { success: false as const, error: 'Enter the 6-character code shown on the supporter’s screen.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: 'Business staff must be logged in to confirm a redemption.' }
  }

  const { data, error } = await (supabase as any).rpc('confirm_redemption_claim', {
    p_confirmation_code: normalizedCode,
  })

  if (error) {
    return { success: false as const, error: friendlyError(error.message) }
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result?.redemption_id) {
    return { success: false as const, error: 'The redemption could not be confirmed. Please try again.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/deals')
  revalidatePath('/dashboard/activity')
  revalidatePath('/dashboard/reports')
  revalidatePath('/dashboard/offers')
  revalidatePath(`/offers/${String(result.offer_id)}`)

  return {
    success: true as const,
    redemptionId: String(result.redemption_id),
    confirmedAt: result.confirmed_at ? String(result.confirmed_at) : new Date().toISOString(),
  }
}
