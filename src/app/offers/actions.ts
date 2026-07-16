'use server'

import { revalidatePath } from 'next/cache'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'

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

export async function addSavedOfferAction(
  offerId: string
): Promise<AddSavedOfferActionResult> {
  const supabase = await createClient()
  const now = new Date()
  const nowIso = now.toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Please log in before adding an offer to your pass.',
    }
  }

  const passAccess = await getCustomerPassAccess(user.id, now)

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

  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('id')
    .eq('id', offerId)
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
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

  const { error: insertError } = await supabase
    .from('saved_offers')
    .insert({
      user_id: user.id,
      offer_id: offer.id,
    })

  if (insertError) {
    if (insertError.code === '23505') {
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

  revalidatePath('/offers')
  revalidatePath(`/offers/${offer.id}`)
  revalidatePath('/dashboard')

  return {
    status: 'success',
  }
}
