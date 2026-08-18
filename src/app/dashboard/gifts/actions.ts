'use server'

import { createHash, randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type RegenerateGiftLinkResult =
  | { status: 'success'; claimPath: string; claimExpiresAt: string }
  | { status: 'error'; message: string }

function createClaimToken() {
  return randomBytes(32).toString('base64url')
}

function hashClaimToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function regenerateGiftClaimLinkAction(
  giftId: string
): Promise<RegenerateGiftLinkResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: 'error', message: 'Log in to manage your gifts.' }
  }

  const admin = createAdminClient() as any
  const { data: gift, error } = await admin
    .from('gift_passes')
    .select('id, purchaser_user_id, status, claim_expires_at')
    .eq('id', giftId)
    .maybeSingle()

  if (error || !gift || gift.purchaser_user_id !== user.id) {
    return { status: 'error', message: 'Gift not found.' }
  }

  if (!['purchased', 'delivered'].includes(gift.status)) {
    return {
      status: 'error',
      message:
        gift.status === 'claimed'
          ? 'This gift has already been claimed.'
          : 'This gift is not currently available to share.',
    }
  }

  if (
    !gift.claim_expires_at ||
    new Date(gift.claim_expires_at).getTime() <= Date.now()
  ) {
    return {
      status: 'error',
      message: 'This gift claim window has expired. Contact RaiseHub support for help.',
    }
  }

  const claimToken = createClaimToken()
  const { error: updateError } = await admin
    .from('gift_passes')
    .update({
      claim_token_hash: hashClaimToken(claimToken),
      updated_at: new Date().toISOString(),
    })
    .eq('id', gift.id)
    .eq('purchaser_user_id', user.id)
    .in('status', ['purchased', 'delivered'])

  if (updateError) {
    return {
      status: 'error',
      message: 'We could not regenerate the gift link. Please try again.',
    }
  }

  revalidatePath('/dashboard/gifts')

  return {
    status: 'success',
    claimPath: `/gifts/claim/${claimToken}`,
    claimExpiresAt: gift.claim_expires_at,
  }
}
