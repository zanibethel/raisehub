'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type CreateOfferInput = {
  title: string
  discount: string
  description: string
  starts_at?: string
  ends_at?: string
}

export async function createOfferAction(input: CreateOfferInput) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return { error: 'Could not read your business profile.' }
  }

  const tier = profile?.subscription_tier ?? 'free'
  const ACTIVE_OFFER_LIMIT = 3
  const now = new Date().toISOString()

const { data: activeOffers, error: activeOffersError } = await supabase
  .from('offers')
  .select('id')
  .eq('business_id', user.id)
  .eq('is_active', true)
  .or(`ends_at.is.null,ends_at.gte.${now}`)

  if (activeOffersError) {
    return { error: 'Could not check your active offers.' }
  }

  if (tier === 'free' && (activeOffers?.length ?? 0) >= ACTIVE_OFFER_LIMIT) {
    return {
      error:
        'You have reached the free limit of 3 active offers. Upgrade to add more.',
    }
  }

  const { error: insertError } = await supabase.from('offers').insert({
    business_id: user.id,
    title: input.title,
    discount: input.discount,
    description: input.description,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  return { success: true }
}
// =========================================
// 📴 DEACTIVATE OFFER
// Hides an offer without deleting history.
// =========================================
export async function deactivateOfferAction(offerId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('offers')
    .update({ is_active: false })
    .eq('id', offerId)
    .eq('business_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/offers')

  return { success: true }
}
// =========================================
// ▶️ REACTIVATE OFFER
// Restores a paused offer if the business has
// an available active-offer slot.
// =========================================

export async function reactivateOfferAction(offerId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return { error: 'Could not read your business profile.' }
  }

  const tier = profile?.subscription_tier ?? 'free'
  const activeOfferLimit = 3
  const now = new Date().toISOString()

  const { data: activeOffers, error: activeOffersError } = await supabase
    .from('offers')
    .select('id')
    .eq('business_id', user.id)
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gte.${now}`)

  if (activeOffersError) {
    return { error: 'Could not check your active offers.' }
  }

  if (
    tier === 'free' &&
    (activeOffers?.length ?? 0) >= activeOfferLimit
  ) {
    return {
      error:
        'You already have 3 active offers. Pause another offer before reactivating this one.',
    }
  }

  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('ends_at')
    .eq('id', offerId)
    .eq('business_id', user.id)
    .single()

  if (offerError || !offer) {
    return { error: 'Offer not found.' }
  }

  if (offer.ends_at && new Date(offer.ends_at) < new Date()) {
    return {
      error:
        'This offer has expired. Edit the end date before reactivating it.',
    }
  }

  const { error } = await supabase
    .from('offers')
    .update({ is_active: true })
    .eq('id', offerId)
    .eq('business_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/offers')

  return { success: true }
}

type UpdateOfferInput = {
  offerId: string
  title: string
  discount: string
  description: string
  starts_at?: string
  ends_at?: string
}

export async function updateOfferAction(input: UpdateOfferInput) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in.' }
  }

  if (
    !input.title.trim() ||
    !input.discount.trim() ||
    !input.description.trim()
  ) {
    return {
      error: 'Add a title, member benefit, and description.',
    }
  }

  if (
    input.starts_at &&
    input.ends_at &&
    input.ends_at < input.starts_at
  ) {
    return {
      error: 'The end date must be after the start date.',
    }
  }

  const { error } = await supabase
    .from('offers')
    .update({
      title: input.title.trim(),
      discount: input.discount.trim(),
      description: input.description.trim(),
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
    })
    .eq('id', input.offerId)
    .eq('business_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/offers/${input.offerId}`)
  revalidatePath('/offers')
  revalidatePath('/')

  return { success: true }
}