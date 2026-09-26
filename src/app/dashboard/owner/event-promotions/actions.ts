'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type EventPromotionSettingsActionState = {
  success: boolean
  message: string | null
}

const INITIAL_STATE: EventPromotionSettingsActionState = {
  success: false,
  message: null,
}

function read(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === 'on'
}

function parsePositiveInt(value: string, min: number, max: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null
}

function parseMoneyToCents(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1000) return null
  return Math.round(parsed * 100)
}

async function requireOwner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  return profile?.role === 'owner' ? user : null
}

export async function updateEventPromotionSettingsAction(
  _previousState: EventPromotionSettingsActionState = INITIAL_STATE,
  formData: FormData
): Promise<EventPromotionSettingsActionState> {
  const owner = await requireOwner()
  if (!owner) {
    return { success: false, message: 'Owner access is required.' }
  }

  const defaultDuration = parsePositiveInt(
    read(formData, 'defaultPaidDurationDays'),
    1,
    90
  )
  const partnerPointCost = parsePositiveInt(
    read(formData, 'partnerPointCost'),
    1,
    100000
  )
  const partnerPointDuration = parsePositiveInt(
    read(formData, 'partnerPointDurationDays'),
    1,
    90
  )

  if (!defaultDuration || !partnerPointCost || !partnerPointDuration) {
    return {
      success: false,
      message: 'Enter valid Event Promotion durations and Partner Point pricing.',
    }
  }

  const durations = [3, 7, 14]
  const options = durations.map((duration, index) => {
    const priceCents = parseMoneyToCents(read(formData, `price_${duration}`))
    return {
      duration,
      priceCents,
      enabled: checked(formData, `enabled_${duration}`),
      sortOrder: (index + 1) * 10,
    }
  })

  if (options.some((option) => option.priceCents === null)) {
    return {
      success: false,
      message: 'Each paid promotion price must be between $0.01 and $1,000.',
    }
  }

  const paidEnabled = checked(formData, 'paidEnabled')
  if (
    paidEnabled &&
    !options.some(
      (option) => option.enabled && option.duration === defaultDuration
    )
  ) {
    return {
      success: false,
      message:
        'The default paid duration must be one of the enabled promotion options.',
    }
  }

  const admin = createAdminClient() as any
  const now = new Date().toISOString()

  const { error: settingsError } = await admin
    .from('event_promotion_settings')
    .upsert(
      {
        id: 'default',
        paid_enabled: paidEnabled,
        default_paid_duration_days: defaultDuration,
        partner_points_enabled: checked(formData, 'partnerPointsEnabled'),
        partner_point_cost: partnerPointCost,
        partner_point_duration_days: partnerPointDuration,
        supporter_spotlight_enabled: checked(
          formData,
          'supporterSpotlightEnabled'
        ),
        local_events_featured_enabled: checked(
          formData,
          'localEventsFeaturedEnabled'
        ),
        updated_by: owner.id,
        updated_at: now,
      },
      { onConflict: 'id' }
    )

  if (settingsError) {
    return {
      success: false,
      message: 'Could not update Event Promotion settings.',
    }
  }

  for (const option of options) {
    const { error } = await admin.from('event_promotion_price_options').upsert(
      {
        duration_days: option.duration,
        price_cents: option.priceCents,
        is_enabled: option.enabled,
        sort_order: option.sortOrder,
        updated_by: owner.id,
        updated_at: now,
      },
      { onConflict: 'duration_days' }
    )

    if (error) {
      return {
        success: false,
        message:
          'Core settings were saved, but one paid promotion option could not be updated.',
      }
    }
  }

  const partnerPointsEnabled = checked(formData, 'partnerPointsEnabled')
  const { error: marketplaceError } = await admin
    .from('partner_reward_marketplace_items')
    .update({
      point_cost: partnerPointCost,
      duration_days: partnerPointDuration,
      is_active: partnerPointsEnabled,
      updated_at: now,
    })
    .eq('code', 'event_promotion_7d')

  if (marketplaceError) {
    return {
      success: false,
      message:
        'Promotion settings were saved, but the Partner Points marketplace item could not be synchronized.',
    }
  }

  const supporterSpotlightEnabled = checked(
    formData,
    'supporterSpotlightEnabled'
  )

  const spotlightUpdate = admin
    .from('spotlight_campaigns')
    .update({
      is_active: supporterSpotlightEnabled,
      updated_at: now,
    })
    .eq('source_type', 'business_event_promotion')

  if (supporterSpotlightEnabled) {
    spotlightUpdate.gt('ends_at', now)
  }

  const { error: spotlightError } = await spotlightUpdate

  if (spotlightError) {
    return {
      success: false,
      message:
        'Promotion settings were saved, but existing event Spotlights could not be synchronized.',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/rewards')
  revalidatePath('/dashboard/business/events')
  revalidatePath('/dashboard/owner/event-promotions')

  return {
    success: true,
    message: 'Event Promotion settings are updated.',
  }
}
