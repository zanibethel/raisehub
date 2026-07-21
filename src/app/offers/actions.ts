'use server'

import { revalidatePath } from 'next/cache'

import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Result types
// =============================================================================

export type AddSavedOfferActionResult =
  | {
      status: 'success'
    }
  | {
      status: 'already-saved'
    }
  | {
      status: 'error'
      message: string
    }

export type RemoveSavedOfferActionResult =
  | {
      status: 'success'
    }
  | {
      status: 'not-saved'
    }
  | {
      status: 'error'
      message: string
    }

// =============================================================================
// Revalidation
// =============================================================================

function revalidateCustomerOfferPaths(
  offerId: string
) {
  revalidatePath('/offers')
  revalidatePath(`/offers/${offerId}`)
  revalidatePath('/dashboard')
}

// =============================================================================
// Add saved offer
// =============================================================================

export async function addSavedOfferAction(
  offerId: string
): Promise<AddSavedOfferActionResult> {
  const normalizedOfferId =
    offerId.trim()

  if (!normalizedOfferId) {
    return {
      status: 'error',
      message:
        'A valid offer is required.',
    }
  }

  const supabase = await createClient()
  const now = new Date()
  const nowIso = now.toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message:
        'Please log in before adding an offer to your pass.',
    }
  }

  const passAccess =
    await getCustomerPassAccess(
      user.id,
      now
    )

  if (passAccess.error) {
    return {
      status: 'error',
      message:
        'We could not verify your RaiseHub pass. Please try again.',
    }
  }

  if (!passAccess.hasActivePass) {
    return {
      status: 'error',
      message:
        'An active RaiseHub pass is required to add this offer.',
    }
  }

  const {
    data: offer,
    error: offerError,
  } = await supabase
    .from('offers')
    .select('id')
    .eq('id', normalizedOfferId)
    .eq('is_active', true)
    .or(
      `starts_at.is.null,starts_at.lte.${nowIso}`
    )
    .or(
      `ends_at.is.null,ends_at.gte.${nowIso}`
    )
    .maybeSingle()

  if (offerError) {
    return {
      status: 'error',
      message:
        'We could not confirm this offer right now. Please try again.',
    }
  }

  if (!offer) {
    return {
      status: 'error',
      message:
        'This offer is no longer available to add to your pass.',
    }
  }

  const { error: insertError } =
    await supabase
      .from('saved_offers')
      .insert({
        user_id: user.id,
        offer_id: offer.id,
      })

  if (insertError) {
    if (
      insertError.code === '23505'
    ) {
      return {
        status: 'already-saved',
      }
    }

    return {
      status: 'error',
      message:
        'We could not add this offer to your pass. Please try again.',
    }
  }

  revalidateCustomerOfferPaths(
    offer.id
  )

  return {
    status: 'success',
  }
}

// =============================================================================
// Remove saved offer
// =============================================================================

export async function removeSavedOfferAction(
  offerId: string
): Promise<RemoveSavedOfferActionResult> {
  const normalizedOfferId =
    offerId.trim()

  if (!normalizedOfferId) {
    return {
      status: 'error',
      message:
        'A valid offer is required.',
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message:
        'Please log in before removing an offer from your pass.',
    }
  }

  const {
    data: savedOffer,
    error: savedOfferError,
  } = await supabase
    .from('saved_offers')
    .select('id')
    .eq('user_id', user.id)
    .eq(
      'offer_id',
      normalizedOfferId
    )
    .maybeSingle()

  if (savedOfferError) {
    return {
      status: 'error',
      message:
        'We could not check this saved offer right now. Please try again.',
    }
  }

  if (!savedOffer) {
    return {
      status: 'not-saved',
    }
  }

  const { error: deleteError } =
    await supabase
      .from('saved_offers')
      .delete()
      .eq('id', savedOffer.id)
      .eq('user_id', user.id)

  if (deleteError) {
    return {
      status: 'error',
      message:
        'We could not remove this offer from your pass. Please try again.',
    }
  }

  revalidateCustomerOfferPaths(
    normalizedOfferId
  )

  return {
    status: 'success',
  }
}