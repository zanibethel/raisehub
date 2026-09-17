'use server'

import { revalidatePath } from 'next/cache'

import { getPartnerRewardsSummary } from '@/lib/repositories/partner-rewards-repository'
import {
  inferOfferUsageRuleFromDescription,
  isOfferUsageRule,
  type OfferUsageRule,
} from '@/lib/redemption-rules'
import { resolveCurrentBusinessWorkspace } from '@/lib/services/current-business-workspace-service'
import { createClient } from '@/lib/supabase/server'

type CreateOfferInput = {
  title: string
  discount: string
  description: string
  starts_at?: string
  ends_at?: string
  usage_rule?: OfferUsageRule
  customer_value?: number
}

function normalizeCustomerValue(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value) || value < 0 || value > 100000) return undefined
  return Math.round(value * 100) / 100
}

async function getActiveOfferLimit({
  canonicalBusinessId,
  subscriptionTier,
}: {
  canonicalBusinessId: string | null
  subscriptionTier: string
}) {
  if (subscriptionTier === 'growth') return Number.POSITIVE_INFINITY

  const rewards = canonicalBusinessId
    ? await getPartnerRewardsSummary(canonicalBusinessId)
    : null

  return 3 + (rewards?.activeExtraOfferSlots ?? 0)
}

export async function createOfferAction(input: CreateOfferInput) {
  const workspaceResult = await resolveCurrentBusinessWorkspace({
    requireManage: true,
  })

  if (!workspaceResult.success) {
    return { error: workspaceResult.error }
  }

  const { workspace } = workspaceResult
  const usageRule =
    input.usage_rule ?? inferOfferUsageRuleFromDescription(input.description)

  if (!isOfferUsageRule(usageRule)) {
    return { error: 'Choose a valid redemption frequency.' }
  }

  const customerValue = normalizeCustomerValue(input.customer_value)
  if (customerValue === undefined) {
    return { error: 'Customer value must be a valid dollar amount.' }
  }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const activeOfferLimit = await getActiveOfferLimit({
    canonicalBusinessId: workspace.canonicalBusinessId,
    subscriptionTier: workspace.subscriptionTier,
  })

  const { data: activeOffers, error: activeOffersError } = await supabase
    .from('offers')
    .select('id')
    .in('business_id', workspace.offerBusinessIds)
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gte.${now}`)

  if (activeOffersError) {
    return { error: 'Could not check your active offers.' }
  }

  if ((activeOffers?.length ?? 0) >= activeOfferLimit) {
    return {
      error:
        activeOfferLimit === 3
          ? 'You have reached the free limit of 3 active offers. Upgrade to add more.'
          : `You are using all ${activeOfferLimit} active offer slots. Pause another offer or earn another offer-slot reward before publishing more.`,
    }
  }

  const { error: insertError } = await supabase.from('offers').insert({
    business_id: workspace.primaryOfferBusinessId,
    title: input.title,
    discount: input.discount,
    description: input.description,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    usage_rule: usageRule,
    customer_value: customerValue,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidateOfferPaths()

  return { success: true }
}

export async function deactivateOfferAction(offerId: string) {
  const workspaceResult = await resolveCurrentBusinessWorkspace({
    requireManage: true,
  })

  if (!workspaceResult.success) {
    return { error: workspaceResult.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('offers')
    .update({ is_active: false })
    .eq('id', offerId)
    .in('business_id', workspaceResult.workspace.offerBusinessIds)

  if (error) return { error: error.message }

  revalidateOfferPaths(offerId)

  return { success: true }
}

export async function reactivateOfferAction(offerId: string) {
  const workspaceResult = await resolveCurrentBusinessWorkspace({
    requireManage: true,
  })

  if (!workspaceResult.success) {
    return { error: workspaceResult.error }
  }

  const { workspace } = workspaceResult
  const supabase = await createClient()
  const activeOfferLimit = await getActiveOfferLimit({
    canonicalBusinessId: workspace.canonicalBusinessId,
    subscriptionTier: workspace.subscriptionTier,
  })
  const now = new Date().toISOString()

  const { data: activeOffers, error: activeOffersError } = await supabase
    .from('offers')
    .select('id')
    .in('business_id', workspace.offerBusinessIds)
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gte.${now}`)

  if (activeOffersError) {
    return { error: 'Could not check your active offers.' }
  }

  if ((activeOffers?.length ?? 0) >= activeOfferLimit) {
    return {
      error:
        activeOfferLimit === 3
          ? 'You already have 3 active offers. Pause another offer before reactivating this one.'
          : `You are using all ${activeOfferLimit} active offer slots. Pause another offer before reactivating this one.`,
    }
  }

  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('ends_at')
    .eq('id', offerId)
    .in('business_id', workspace.offerBusinessIds)
    .maybeSingle()

  if (offerError || !offer) {
    return { error: 'Offer not found in the selected business workspace.' }
  }

  if (offer.ends_at && new Date(offer.ends_at) < new Date()) {
    return {
      error: 'This offer has expired. Edit the end date before reactivating it.',
    }
  }

  const { error } = await supabase
    .from('offers')
    .update({ is_active: true })
    .eq('id', offerId)
    .in('business_id', workspace.offerBusinessIds)

  if (error) {
    return { error: error.message }
  }

  revalidateOfferPaths(offerId)

  return { success: true }
}

type UpdateOfferInput = {
  offerId: string
  title: string
  discount: string
  description: string
  starts_at?: string
  ends_at?: string
  usage_rule: OfferUsageRule
  customer_value?: number | null
}

export async function updateOfferAction(input: UpdateOfferInput) {
  const workspaceResult = await resolveCurrentBusinessWorkspace({
    requireManage: true,
  })

  if (!workspaceResult.success) {
    return { error: workspaceResult.error }
  }

  if (
    !input.title.trim() ||
    !input.discount.trim() ||
    !input.description.trim()
  ) {
    return { error: 'Add a title, member benefit, and description.' }
  }

  if (!isOfferUsageRule(input.usage_rule)) {
    return { error: 'Choose a valid redemption frequency.' }
  }

  const customerValue = normalizeCustomerValue(input.customer_value)
  if (customerValue === undefined) {
    return { error: 'Customer value must be a valid dollar amount.' }
  }

  if (input.starts_at && input.ends_at && input.ends_at < input.starts_at) {
    return { error: 'The end date must be after the start date.' }
  }

  const supabase = await createClient()
  const { data: ownedOffer, error: ownershipError } = await supabase
    .from('offers')
    .select('id')
    .eq('id', input.offerId)
    .in('business_id', workspaceResult.workspace.offerBusinessIds)
    .maybeSingle()

  if (ownershipError || !ownedOffer) {
    return { error: 'Offer not found in the selected business workspace.' }
  }

  const { error } = await supabase
    .from('offers')
    .update({
      title: input.title.trim(),
      discount: input.discount.trim(),
      description: input.description.trim(),
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
      usage_rule: input.usage_rule,
      customer_value: customerValue,
    })
    .eq('id', input.offerId)
    .in('business_id', workspaceResult.workspace.offerBusinessIds)

  if (error) {
    return { error: error.message }
  }

  revalidateOfferPaths(input.offerId)

  return { success: true }
}

function revalidateOfferPaths(offerId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/offers')
  revalidatePath('/dashboard/reports')
  revalidatePath('/offers')
  revalidatePath('/')

  if (offerId) {
    revalidatePath(`/offers/${offerId}`)
    revalidatePath(`/dashboard/offers/${offerId}/edit`)
  }
}
