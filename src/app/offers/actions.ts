'use server'

import { revalidatePath } from 'next/cache'

import {
  applyEnvironmentScope,
  getActiveDataEnvironment,
  requireRelatedRecordEnvironment,
  type EnvironmentOwnedRecord,
} from '@/lib/data-environment'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'

export type AddSavedOfferActionResult =
  | { status: 'success' }
  | { status: 'already-saved' }
  | { status: 'error'; message: string }

export type RemoveSavedOfferActionResult =
  | { status: 'success' }
  | { status: 'not-saved' }
  | { status: 'error'; message: string }

type ScopedOffer = EnvironmentOwnedRecord & {
  id: string
  business_id: string
}

type ScopedBusiness = EnvironmentOwnedRecord & {
  id: string
}

function revalidateCustomerOfferPaths(offerId: string) {
  revalidatePath('/offers')
  revalidatePath(`/offers/${offerId}`)
  revalidatePath('/dashboard')
}

export async function addSavedOfferAction(
  offerId: string
): Promise<AddSavedOfferActionResult> {
  const normalizedOfferId = offerId.trim()
  if (!normalizedOfferId) {
    return { status: 'error', message: 'A valid offer is required.' }
  }

  const supabase = await createClient()
  const environment = getActiveDataEnvironment()
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
      message: 'We could not verify your RaiseHub pass. Please try again.',
    }
  }
  if (!passAccess.hasActivePass) {
    return {
      status: 'error',
      message: 'An active RaiseHub pass is required to add this offer.',
    }
  }

  const offerQuery = supabase
    .from('offers')
    .select('id, business_id, is_demo, demo_group')
    .eq('id', normalizedOfferId)
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)

  const { data: offerData, error: offerError } = await applyEnvironmentScope(
    offerQuery,
    environment
  ).maybeSingle()
  const offer = offerData as ScopedOffer | null

  if (offerError) {
    return {
      status: 'error',
      message: 'We could not confirm this offer right now. Please try again.',
    }
  }
  if (!offer) {
    return {
      status: 'error',
      message: 'This offer is no longer available to add to your pass.',
    }
  }

  const businessQuery = supabase
    .from('profiles')
    .select('id, is_demo, demo_group')
    .eq('id', offer.business_id)
    .eq('role', 'business')

  const { data: businessData } = await applyEnvironmentScope(
    businessQuery,
    environment
  ).maybeSingle()

  try {
    requireRelatedRecordEnvironment(
      businessData as ScopedBusiness | null,
      offer,
      environment
    )
  } catch {
    return {
      status: 'error',
      message: 'This offer is unavailable in the current workspace.',
    }
  }

  const { error: insertError } = await supabase.from('saved_offers').insert({
    user_id: user.id,
    offer_id: offer.id,
    is_demo: offer.is_demo === true,
    demo_group: offer.demo_group ?? null,
  })

  if (insertError) {
    if (insertError.code === '23505') return { status: 'already-saved' }
    return {
      status: 'error',
      message: 'We could not add this offer to your pass. Please try again.',
    }
  }

  revalidateCustomerOfferPaths(offer.id)
  return { status: 'success' }
}

export async function removeSavedOfferAction(
  offerId: string
): Promise<RemoveSavedOfferActionResult> {
  const normalizedOfferId = offerId.trim()
  if (!normalizedOfferId) {
    return { status: 'error', message: 'A valid offer is required.' }
  }

  const supabase = await createClient()
  const environment = getActiveDataEnvironment()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Please log in before removing an offer from your pass.',
    }
  }

  const savedOfferQuery = supabase
    .from('saved_offers')
    .select('id, is_demo, demo_group')
    .eq('user_id', user.id)
    .eq('offer_id', normalizedOfferId)

  const { data: savedOffer, error: savedOfferError } = await applyEnvironmentScope(
    savedOfferQuery,
    environment
  ).maybeSingle()

  if (savedOfferError) {
    return {
      status: 'error',
      message: 'We could not check this saved offer right now. Please try again.',
    }
  }
  if (!savedOffer) return { status: 'not-saved' }

  const redemptionQuery = supabase
    .from('redemptions')
    .select('offer_id, is_demo, demo_group')
    .eq('user_id', user.id)
    .eq('offer_id', normalizedOfferId)
    .limit(1)

  const { data: redemption, error: redemptionError } = await applyEnvironmentScope(
    redemptionQuery,
    environment
  ).maybeSingle()

  if (redemptionError) {
    return {
      status: 'error',
      message: 'We could not verify this offer’s redemption history. Please try again.',
    }
  }
  if (redemption) {
    return {
      status: 'error',
      message: 'Used deals are kept in My Pass as part of your redemption history.',
    }
  }

  let deleteQuery = supabase
    .from('saved_offers')
    .delete()
    .eq('id', savedOffer.id)
    .eq('user_id', user.id)
  deleteQuery = applyEnvironmentScope(deleteQuery, environment)

  const { error: deleteError } = await deleteQuery
  if (deleteError) {
    return {
      status: 'error',
      message: 'We could not remove this offer from your pass. Please try again.',
    }
  }

  revalidateCustomerOfferPaths(normalizedOfferId)
  return { status: 'success' }
}
