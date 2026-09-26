import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type EventPromotionSettings = {
  paidEnabled: boolean
  defaultPaidDurationDays: number
  partnerPointsEnabled: boolean
  partnerPointCost: number
  partnerPointDurationDays: number
  supporterSpotlightEnabled: boolean
  localEventsFeaturedEnabled: boolean
  updatedAt: string | null
}

export type EventPromotionPriceOption = {
  id: string
  durationDays: number
  priceCents: number
  isEnabled: boolean
  sortOrder: number
}

export type EventPromotionOwnerOverview = {
  settings: EventPromotionSettings
  priceOptions: EventPromotionPriceOption[]
  activePromotionCount: number
  activeSpotlightCount: number
}

const FALLBACK_SETTINGS: EventPromotionSettings = {
  paidEnabled: true,
  defaultPaidDurationDays: 7,
  partnerPointsEnabled: true,
  partnerPointCost: 600,
  partnerPointDurationDays: 7,
  supporterSpotlightEnabled: true,
  localEventsFeaturedEnabled: true,
  updatedAt: null,
}

const FALLBACK_OPTIONS: EventPromotionPriceOption[] = [
  { id: 'fallback-3', durationDays: 3, priceCents: 299, isEnabled: true, sortOrder: 10 },
  { id: 'fallback-7', durationDays: 7, priceCents: 499, isEnabled: true, sortOrder: 20 },
  { id: 'fallback-14', durationDays: 14, priceCents: 799, isEnabled: true, sortOrder: 30 },
]

export async function getEventPromotionOwnerOverview(): Promise<EventPromotionOwnerOverview> {
  const admin = createAdminClient() as any
  const now = new Date().toISOString()

  const [settingsResult, optionsResult, promotionsResult, spotlightsResult] =
    await Promise.all([
      admin
        .from('event_promotion_settings')
        .select(
          'paid_enabled,default_paid_duration_days,partner_points_enabled,partner_point_cost,partner_point_duration_days,supporter_spotlight_enabled,local_events_featured_enabled,updated_at'
        )
        .eq('id', 'default')
        .maybeSingle(),
      admin
        .from('event_promotion_price_options')
        .select('id,duration_days,price_cents,is_enabled,sort_order')
        .order('sort_order', { ascending: true })
        .order('duration_days', { ascending: true }),
      admin
        .from('business_event_promotions')
        .select('id', { count: 'exact', head: true })
        .lte('starts_at', now)
        .gt('ends_at', now),
      admin
        .from('spotlight_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('source_type', 'business_event_promotion')
        .eq('is_active', true)
        .lte('starts_at', now)
        .or(`ends_at.is.null,ends_at.gt.${now}`),
    ])

  const row = settingsResult.data

  const settings: EventPromotionSettings = row
    ? {
        paidEnabled: row.paid_enabled !== false,
        defaultPaidDurationDays: Number(row.default_paid_duration_days ?? 7),
        partnerPointsEnabled: row.partner_points_enabled !== false,
        partnerPointCost: Number(row.partner_point_cost ?? 600),
        partnerPointDurationDays: Number(row.partner_point_duration_days ?? 7),
        supporterSpotlightEnabled: row.supporter_spotlight_enabled !== false,
        localEventsFeaturedEnabled: row.local_events_featured_enabled !== false,
        updatedAt: row.updated_at ?? null,
      }
    : FALLBACK_SETTINGS

  const priceOptions =
    optionsResult.data?.length
      ? optionsResult.data.map((option: any) => ({
          id: String(option.id),
          durationDays: Number(option.duration_days),
          priceCents: Number(option.price_cents),
          isEnabled: option.is_enabled !== false,
          sortOrder: Number(option.sort_order ?? 100),
        }))
      : FALLBACK_OPTIONS

  return {
    settings,
    priceOptions,
    activePromotionCount: Number(promotionsResult.count ?? 0),
    activeSpotlightCount: Number(spotlightsResult.count ?? 0),
  }
}

export async function getPublicEventPromotionOfferings() {
  const { settings, priceOptions } = await getEventPromotionOwnerOverview()

  return {
    paidEnabled: settings.paidEnabled,
    defaultPaidDurationDays: settings.defaultPaidDurationDays,
    partnerPointsEnabled: settings.partnerPointsEnabled,
    partnerPointCost: settings.partnerPointCost,
    partnerPointDurationDays: settings.partnerPointDurationDays,
    supporterSpotlightEnabled: settings.supporterSpotlightEnabled,
    localEventsFeaturedEnabled: settings.localEventsFeaturedEnabled,
    priceOptions: priceOptions.filter((option) => option.isEnabled),
  }
}
