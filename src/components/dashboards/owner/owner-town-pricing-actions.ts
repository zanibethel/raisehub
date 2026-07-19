'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type OwnerTownPricingActionState = {
  success: boolean
  message: string
  stateCode: string
  townName: string
  environment: 'production' | 'demo'
}

export const initialOwnerTownPricingActionState: OwnerTownPricingActionState =
  {
    success: false,
    message: '',
    stateCode: '',
    townName: '',
    environment: 'production',
  }

type OwnerUserResult =
  | {
      status: 'success'
      user: {
        id: string
      }
    }
  | {
      status:
        | 'unauthenticated'
        | 'owner-role-required'
        | 'error'
      message: string
    }

function readFormValue(
  formData: FormData,
  key: string
): string {
  const value = formData.get(key)

  return typeof value === 'string'
    ? value.trim()
    : ''
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

function parseOptionalDate(
  value: string
): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed
}

function parseEnvironment(
  value: string
): 'production' | 'demo' {
  return value === 'demo'
    ? 'demo'
    : 'production'
}

function normalizeStateCode(
  value: string
): string {
  return value.trim().toUpperCase()
}

function normalizeTownName(
  value: string
): string {
  return value.trim().replace(/\s+/g, ' ')
}

function townFailure(
  message: string,
  stateCode: string,
  townName: string,
  environment: 'production' | 'demo'
): OwnerTownPricingActionState {
  return {
    success: false,
    message,
    stateCode,
    townName,
    environment,
  }
}

async function getOwnerUser(): Promise<OwnerUserResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: 'unauthenticated',
      message:
        'Sign in before managing town pricing.',
    }
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (profileError || !profile) {
    return {
      status: 'error',
      message:
        'Unable to verify owner access for town pricing.',
    }
  }

  if (profile.role !== 'owner') {
    return {
      status: 'owner-role-required',
      message:
        'Owner access is required to manage town pricing.',
    }
  }

  return {
    status: 'success',
    user: {
      id: user.id,
    },
  }
}

export async function publishTownPricingAction(
  _previousState: OwnerTownPricingActionState,
  formData: FormData
): Promise<OwnerTownPricingActionState> {
  const stateCode = normalizeStateCode(
    readFormValue(formData, 'stateCode')
  )

  const townName = normalizeTownName(
    readFormValue(formData, 'townName')
  )

  const environment = parseEnvironment(
    readFormValue(formData, 'environment')
  )

  if (!/^[A-Z]{2}$/.test(stateCode)) {
    return townFailure(
      'Enter a valid two-letter state abbreviation.',
      stateCode,
      townName,
      environment
    )
  }

  if (!townName) {
    return townFailure(
      'Enter a town before publishing pricing.',
      stateCode,
      townName,
      environment
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
    return townFailure(
      'Pass price must be greater than $0 and no more than $1,000.',
      stateCode,
      townName,
      environment
    )
  }

  const platformFeePercent = parseMoney(
    readFormValue(
      formData,
      'platformFeePercent'
    )
  )

  if (
    platformFeePercent === null ||
    platformFeePercent < 0 ||
    platformFeePercent > 100
  ) {
    return townFailure(
      'RaiseHub fee must be between 0% and 100%.',
      stateCode,
      townName,
      environment
    )
  }

  const reason =
    readFormValue(formData, 'reason') || null

  const internalNote =
    readFormValue(formData, 'internalNote') ||
    null

  const requestedStartsAt = readFormValue(
    formData,
    'startsAt'
  )

  const requestedExpiresAt = readFormValue(
    formData,
    'expiresAt'
  )

  const parsedStartsAt = parseOptionalDate(
    requestedStartsAt
  )

  const parsedExpiresAt = parseOptionalDate(
    requestedExpiresAt
  )

  if (requestedStartsAt && !parsedStartsAt) {
    return townFailure(
      'Choose a valid town pricing start date.',
      stateCode,
      townName,
      environment
    )
  }

  if (requestedExpiresAt && !parsedExpiresAt) {
    return townFailure(
      'Choose a valid town pricing end date.',
      stateCode,
      townName,
      environment
    )
  }

  const now = new Date()
  const startsAtDate = parsedStartsAt ?? now

  if (
    parsedExpiresAt &&
    parsedExpiresAt <= startsAtDate
  ) {
    return townFailure(
      'The town pricing end date must be after its start date.',
      stateCode,
      townName,
      environment
    )
  }

  const ownerResult = await getOwnerUser()

  if (ownerResult.status !== 'success') {
    return townFailure(
      ownerResult.message,
      stateCode,
      townName,
      environment
    )
  }

  const admin = createAdminClient()
  const isDemo = environment === 'demo'
  const startsAt = startsAtDate.toISOString()
  const expiresAt =
    parsedExpiresAt?.toISOString() ?? null
  const isScheduled = startsAtDate > now

  const {
    data: newRule,
    error: insertError,
  } = await admin
    .from('pricing_rules')
    .insert({
      scope_type: 'town',
      state_code: stateCode,
      town_name: townName,
      pass_price: passPrice,
      platform_fee_percent:
        platformFeePercent,
      status: 'active',
      starts_at: startsAt,
      expires_at: expiresAt,
      reason,
      internal_note: internalNote,
      created_by: ownerResult.user.id,
      updated_by: ownerResult.user.id,
      is_demo: isDemo,
    })
    .select('id')
    .single<{ id: string }>()

  if (insertError || !newRule) {
    return townFailure(
      'The town pricing override could not be created.',
      stateCode,
      townName,
      environment
    )
  }

  const nowIso = now.toISOString()

  if (isScheduled) {
    const {
      error: scheduledRetirementError,
    } = await admin
      .from('pricing_rules')
      .update({
        status: 'inactive',
        updated_by: ownerResult.user.id,
      })
      .eq('scope_type', 'town')
      .eq('state_code', stateCode)
      .ilike('town_name', townName)
      .eq('is_demo', isDemo)
      .eq('status', 'active')
      .gt('starts_at', nowIso)
      .neq('id', newRule.id)

    if (scheduledRetirementError) {
      return townFailure(
        'The new schedule was created, but the previous scheduled town override could not be retired. Review pricing rules before publishing another change.',
        stateCode,
        townName,
        environment
      )
    }

    const {
      error: currentAlignmentError,
    } = await admin
      .from('pricing_rules')
      .update({
        expires_at: startsAt,
        updated_by: ownerResult.user.id,
      })
      .eq('scope_type', 'town')
      .eq('state_code', stateCode)
      .ilike('town_name', townName)
      .eq('is_demo', isDemo)
      .eq('status', 'active')
      .lte('starts_at', nowIso)
      .or(
        `expires_at.is.null,expires_at.gt.${startsAt}`
      )
      .neq('id', newRule.id)

    if (currentAlignmentError) {
      return townFailure(
        'The scheduled town rule was created, but the current override could not be aligned to its start date. Review pricing rules before publishing another change.',
        stateCode,
        townName,
        environment
      )
    }
  } else {
    const {
      error: futureRetirementError,
    } = await admin
      .from('pricing_rules')
      .update({
        status: 'inactive',
        updated_by: ownerResult.user.id,
      })
      .eq('scope_type', 'town')
      .eq('state_code', stateCode)
      .ilike('town_name', townName)
      .eq('is_demo', isDemo)
      .eq('status', 'active')
      .gt('starts_at', nowIso)
      .neq('id', newRule.id)

    if (futureRetirementError) {
      return townFailure(
        'The new town rule is active, but a future scheduled override could not be retired. Review pricing rules before publishing another change.',
        stateCode,
        townName,
        environment
      )
    }

    const {
      error: currentRetirementError,
    } = await admin
      .from('pricing_rules')
      .update({
        status: 'inactive',
        expires_at: startsAt,
        updated_by: ownerResult.user.id,
      })
      .eq('scope_type', 'town')
      .eq('state_code', stateCode)
      .ilike('town_name', townName)
      .eq('is_demo', isDemo)
      .eq('status', 'active')
      .lte('starts_at', nowIso)
      .neq('id', newRule.id)

    if (currentRetirementError) {
      return townFailure(
        'The new town rule is active, but an older override could not be retired. Review pricing rules before publishing another change.',
        stateCode,
        townName,
        environment
      )
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/owner/pricing')

  return {
    success: true,
    message: `$${passPrice.toFixed(
      2
    )} with a ${platformFeePercent.toFixed(
      2
    )}% RaiseHub fee ${
      isScheduled
        ? `is scheduled for ${startsAtDate.toLocaleString(
            'en-US'
          )}`
        : 'is now active'
    } for ${townName}, ${stateCode}${
      parsedExpiresAt
        ? ` until ${parsedExpiresAt.toLocaleString(
            'en-US'
          )}`
        : ''
    }.`,
    stateCode,
    townName,
    environment,
  }
}

export async function retireTownPricingAction(
  _previousState: OwnerTownPricingActionState,
  formData: FormData
): Promise<OwnerTownPricingActionState> {
  const stateCode = normalizeStateCode(
    readFormValue(formData, 'stateCode')
  )

  const townName = normalizeTownName(
    readFormValue(formData, 'townName')
  )

  const environment = parseEnvironment(
    readFormValue(formData, 'environment')
  )

  if (!/^[A-Z]{2}$/.test(stateCode)) {
    return townFailure(
      'Enter a valid two-letter state abbreviation.',
      stateCode,
      townName,
      environment
    )
  }

  if (!townName) {
    return townFailure(
      'Enter a town before retiring pricing.',
      stateCode,
      townName,
      environment
    )
  }

  const ownerResult = await getOwnerUser()

  if (ownerResult.status !== 'success') {
    return townFailure(
      ownerResult.message,
      stateCode,
      townName,
      environment
    )
  }

  const isDemo = environment === 'demo'
  const retiredAt = new Date().toISOString()
  const admin = createAdminClient()

  const {
    data: retiredFutureRules,
    error: futureRetirementError,
  } = await admin
    .from('pricing_rules')
    .update({
      status: 'inactive',
      updated_by: ownerResult.user.id,
    })
    .eq('scope_type', 'town')
    .eq('state_code', stateCode)
    .ilike('town_name', townName)
    .eq('is_demo', isDemo)
    .eq('status', 'active')
    .gt('starts_at', retiredAt)
    .select('id')
    .returns<Array<{ id: string }>>()

  if (futureRetirementError) {
    return townFailure(
      'The scheduled town pricing override could not be retired.',
      stateCode,
      townName,
      environment
    )
  }

  const {
    data: retiredCurrentRules,
    error: currentRetirementError,
  } = await admin
    .from('pricing_rules')
    .update({
      status: 'inactive',
      expires_at: retiredAt,
      updated_by: ownerResult.user.id,
    })
    .eq('scope_type', 'town')
    .eq('state_code', stateCode)
    .ilike('town_name', townName)
    .eq('is_demo', isDemo)
    .eq('status', 'active')
    .lte('starts_at', retiredAt)
    .select('id')
    .returns<Array<{ id: string }>>()

  if (currentRetirementError) {
    return townFailure(
      'The active town pricing override could not be retired.',
      stateCode,
      townName,
      environment
    )
  }

  const retiredRuleCount =
    (retiredFutureRules?.length ?? 0) +
    (retiredCurrentRules?.length ?? 0)

  if (retiredRuleCount === 0) {
    return townFailure(
      'This town does not have an active or scheduled pricing override.',
      stateCode,
      townName,
      environment
    )
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/owner/pricing')

  return {
    success: true,
    message:
      'The town pricing override was retired. Eligible campaigns will return to state, platform, or the $20 / 20% application fallback unless a campaign or organization override applies.',
    stateCode,
    townName,
    environment,
  }
}