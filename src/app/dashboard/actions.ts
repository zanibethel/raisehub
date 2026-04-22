'use server'

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