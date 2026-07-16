'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export type OwnerPricingEnvironment =
  | 'production'
  | 'demo'

export type PublishPlatformPricingActionState = {
  success: boolean
  message: string | null
  environment: OwnerPricingEnvironment | null
}

// =============================================================================
// Constants
// =============================================================================

const INITIAL_STATE: PublishPlatformPricingActionState = {
  success: false,
  message: null,
  environment: null,
}

// =============================================================================
// Helpers
// =============================================================================

function readFormValue(
  formData: FormData,
  key: string
) {
  const value = formData.get(key)

  return typeof value === 'string'
    ? value.trim()
    : ''
}

function isPricingEnvironment(
  value: string
): value is OwnerPricingEnvironment {
  return value === 'production' || value === 'demo'
}

function parseMoney(
  value: string
): number | null {
  if (!value) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed * 100) / 100
}

function failure(
  message: string,
  environment: OwnerPricingEnvironment | null = null
): PublishPlatformPricingActionState {
  return {
    success: false,
    message,
    environment,
  }
}

// =============================================================================
// Action
// =============================================================================

export async function publishPlatformPricingAction(
  _previousState: PublishPlatformPricingActionState = INITIAL_STATE,
  formData: FormData
): Promise<PublishPlatformPricingActionState> {
  const environmentValue =
    readFormValue(formData, 'environment')

  if (!isPricingEnvironment(environmentValue)) {
    return failure(
      'Choose Production or Demo pricing.'
    )
  }

  const passPrice = parseMoney(
    readFormValue(formData, 'passPrice')
  )

  if (
    passPrice === null ||
    passPrice <= 0 ||
    passPrice > 1000
  ) {
    return failure(
      'Pass price must be greater than $0 and no more than $1,000.',
      environmentValue
    )
  }

  const platformFeePercent = parseMoney(
    readFormValue(formData, 'platformFeePercent')
  )

  if (
    platformFeePercent === null ||
    platformFeePercent < 0 ||
    platformFeePercent > 100
  ) {
    return failure(
      'RaiseHub fee must be between 0% and 100%.',
      environmentValue
    )
  }

  const reason =
    readFormValue(formData, 'reason') ||
    `Updated ${environmentValue} platform default`

  const internalNote =
    readFormValue(formData, 'internalNote') ||
    null

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return failure(
      'Sign in before changing platform pricing.',
      environmentValue
    )
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

  if (profileError || !profile) {
    return failure(
      'Unable to verify owner access.',
      environmentValue
    )
  }

  if (profile.role !== 'owner') {
    return failure(
      'Owner access is required.',
      environmentValue
    )
  }

  const isDemo = environmentValue === 'demo'
  const startsAt = new Date().toISOString()
  const admin = createAdminClient()

  // Insert the new default first so checkout never loses a managed rule.
  const { data: newRule, error: insertError } =
    await admin
      .from('pricing_rules')
      .insert({
        scope_type: 'platform',
        pass_price: passPrice,
        platform_fee_percent:
          platformFeePercent,
        status: 'active',
        starts_at: startsAt,
        reason,
        internal_note: internalNote,
        created_by: user.id,
        updated_by: user.id,
        is_demo: isDemo,
        demo_group: null,
      })
      .select('id')
      .single<{ id: string }>()

  if (insertError || !newRule) {
    return failure(
      'The new platform pricing rule could not be published.',
      environmentValue
    )
  }

  // Retire older defaults only after the replacement exists.
  const { error: retirementError } =
    await admin
      .from('pricing_rules')
      .update({
        status: 'inactive',
        expires_at: startsAt,
        updated_by: user.id,
      })
      .eq('scope_type', 'platform')
      .eq('is_demo', isDemo)
      .eq('status', 'active')
      .neq('id', newRule.id)

  if (retirementError) {
    return failure(
      'The new rule is active, but older platform defaults could not be retired. Review pricing rules before publishing another change.',
      environmentValue
    )
  }

  revalidatePath('/dashboard')

  return {
    success: true,
    message: `$${passPrice.toFixed(
      2
    )} with a ${platformFeePercent.toFixed(
      2
    )}% RaiseHub fee is now the ${environmentValue} platform default.`,
    environment: environmentValue,
  }
}
