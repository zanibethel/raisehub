'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

function friendlyError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('single-use offer has already been redeemed')) {
    return 'This single-use offer has already been redeemed.'
  }
  if (normalized.includes('once every 24 hours')) {
    return 'This offer becomes available again 24 hours after the last redemption.'
  }
  if (normalized.includes('once every 7 days')) {
    return 'This offer becomes available again 7 days after the last redemption.'
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
    return 'That verification code was not found. Check the supporter’s screen and try again.'
  }
  if (normalized.includes('code has expired')) {
    return 'That optional verification code expired. The redemption can still auto-confirm after its review window.'
  }
  if (normalized.includes('different business')) {
    return 'That redemption belongs to a different business.'
  }
  if (normalized.includes('business staff must be logged in')) {
    return 'Business staff must be logged in to manage a redemption.'
  }
  if (normalized.includes('24-hour review window')) {
    return 'The 24-hour review window has ended, so this redemption can no longer be rejected.'
  }
  if (normalized.includes('only pending redemptions can be rejected')) {
    return 'Only pending redemptions can be rejected.'
  }
  if (normalized.includes('environment')) {
    return 'This redemption belongs to a different RaiseHub environment.'
  }

  return message || 'We could not complete the redemption action. Please try again.'
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
    return { success: false as const, error: 'We could not record this redemption. Please try again.' }
  }

  const statusResult = await getRedemptionClaimStatusAction(String(claim.claim_id))

  return {
    success: true as const,
    claim: {
      id: String(claim.claim_id),
      code: String(claim.confirmation_code),
      expiresAt: String(claim.expires_at),
      status: String(claim.status ?? 'pending'),
    },
    redemptionStatus:
      statusResult.success ? statusResult.redemptionStatus : 'pending',
    autoConfirmAt:
      statusResult.success ? statusResult.autoConfirmAt : null,
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
    return { success: false as const, error: 'This redemption is no longer available.' }
  }

  let redemptionStatus: string | null = null
  let autoConfirmAt: string | null = null
  let redemptionConfirmedAt: string | null = null
  let rejectedAt: string | null = null

  if (claim.redemption_id) {
    const { data: redemption } = await (supabase as any)
      .from('redemptions')
      .select('status, auto_confirm_at, confirmed_at, rejected_at')
      .eq('id', claim.redemption_id)
      .maybeSingle()

    if (redemption) {
      redemptionStatus = String(redemption.status ?? '') || null
      autoConfirmAt = redemption.auto_confirm_at ? String(redemption.auto_confirm_at) : null
      redemptionConfirmedAt = redemption.confirmed_at ? String(redemption.confirmed_at) : null
      rejectedAt = redemption.rejected_at ? String(redemption.rejected_at) : null
    }
  }

  return {
    success: true as const,
    status: String(claim.status),
    redemptionStatus,
    expiresAt: claim.expires_at ? String(claim.expires_at) : null,
    autoConfirmAt,
    confirmedAt:
      redemptionConfirmedAt || (claim.confirmed_at ? String(claim.confirmed_at) : null),
    rejectedAt,
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

  revalidateRedemptionPaths(String(result.offer_id))

  return {
    success: true as const,
    redemptionId: String(result.redemption_id),
    confirmedAt: result.confirmed_at ? String(result.confirmed_at) : new Date().toISOString(),
  }
}

export async function rejectRedemptionAction(
  redemptionId: string,
  reason = 'Business reported this redemption as unauthorized.'
) {
  const normalizedRedemptionId = redemptionId.trim()
  if (!normalizedRedemptionId) {
    return { success: false as const, error: 'A valid redemption is required.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: 'Business staff must be logged in to reject a redemption.' }
  }

  const { data, error } = await (supabase as any).rpc('reject_redemption', {
    p_redemption_id: normalizedRedemptionId,
    p_reason: reason,
  })

  if (error) {
    return { success: false as const, error: friendlyError(error.message) }
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result?.redemption_id) {
    return { success: false as const, error: 'The redemption could not be rejected. Please try again.' }
  }

  revalidateRedemptionPaths()

  return {
    success: true as const,
    redemptionId: String(result.redemption_id),
    rejectedAt: result.rejected_at ? String(result.rejected_at) : new Date().toISOString(),
  }
}

function revalidateRedemptionPaths(offerId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/deals')
  revalidatePath('/dashboard/activity')
  revalidatePath('/dashboard/reports')
  revalidatePath('/dashboard/offers')

  if (offerId) {
    revalidatePath(`/offers/${offerId}`)
  }
}
