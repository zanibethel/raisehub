'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type OwnerOrganizationPricingActionState = {
  success: boolean
  message: string
  organizationId: string
  environment: 'production' | 'demo'
}

export const initialOwnerOrganizationPricingActionState: OwnerOrganizationPricingActionState =
  {
    success: false,
    message: '',
    organizationId: '',
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
      status: 'unauthenticated' | 'owner-role-required' | 'error'
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

function organizationFailure(
  message: string,
  organizationId: string,
  environment: 'production' | 'demo'
): OwnerOrganizationPricingActionState {
  return {
    success: false,
    message,
    organizationId,
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
        'Sign in before managing organization pricing.',
    }
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

  if (profileError || !profile) {
    return {
      status: 'error',
      message:
        'Unable to verify owner access for organization pricing.',
    }
  }

  if (profile.role !== 'owner') {
    return {
      status: 'owner-role-required',
      message:
        'Owner access is required to manage organization pricing.',
    }
  }

  return {
    status: 'success',
    user: {
      id: user.id,
    },
  }
}

export async function publishOrganizationPricingAction(
  _previousState: OwnerOrganizationPricingActionState,
  formData: FormData
): Promise<OwnerOrganizationPricingActionState> {
  const organizationId = readFormValue(
    formData,
    'organizationId'
  )

  const environment = parseEnvironment(
    readFormValue(formData, 'environment')
  )

  if (!organizationId) {
    return organizationFailure(
      'Choose an organization before publishing pricing.',
      organizationId,
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
    return organizationFailure(
      'Pass price must be greater than $0 and no more than $1,000.',
      organizationId,
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
    return organizationFailure(
      'RaiseHub fee must be between 0% and 100%.',
      organizationId,
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
    return organizationFailure(
      'Choose a valid organization pricing start date.',
      organizationId,
      environment
    )
  }

  if (requestedExpiresAt && !parsedExpiresAt) {
    return organizationFailure(
      'Choose a valid organization pricing end date.',
      organizationId,
      environment
    )
  }

  const now = new Date()
  const startsAtDate = parsedStartsAt ?? now

  if (
    parsedExpiresAt &&
    parsedExpiresAt <= startsAtDate
  ) {
    return organizationFailure(
      'The organization pricing end date must be after its start date.',
      organizationId,
      environment
    )
  }

  const ownerResult = await getOwnerUser()

  if (ownerResult.status !== 'success') {
    return organizationFailure(
      ownerResult.message,
      organizationId,
      environment
    )
  }

  const admin = createAdminClient()

  const { data: organization, error: organizationError } =
    await admin
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .maybeSingle<{ id: string }>()

  if (organizationError || !organization) {
    return organizationFailure(
      'The selected organization could not be found.',
      organizationId,
      environment
    )
  }

  const isDemo = environment === 'demo'
  const startsAt = startsAtDate.toISOString()
  const expiresAt =
    parsedExpiresAt?.toISOString() ?? null
  const isScheduled = startsAtDate > now

  const { data: newRule, error: insertError } =
    await admin
      .from('pricing_rules')
      .insert({
        scope_type: 'organization',
        organization_id: organizationId,
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
    return organizationFailure(
      'The organization pricing override could not be created.',
      organizationId,
      environment
    )
  }

  if (isScheduled) {
    const nowIso = now.toISOString()

    const { error: scheduledRetirementError } =
      await admin
        .from('pricing_rules')
        .update({
          status: 'inactive',
          updated_by: ownerResult.user.id,
        })
        .eq('scope_type', 'organization')
        .eq('organization_id', organizationId)
        .eq('is_demo', isDemo)
        .eq('status', 'active')
        .gt('starts_at', nowIso)
        .neq('id', newRule.id)

    if (scheduledRetirementError) {
      return organizationFailure(
        'The new schedule was created, but the previous scheduled organization override could not be retired. Review pricing rules before publishing another change.',
        organizationId,
        environment
      )
    }

    const { error: currentAlignmentError } =
      await admin
        .from('pricing_rules')
        .update({
          expires_at: startsAt,
          updated_by: ownerResult.user.id,
        })
        .eq('scope_type', 'organization')
        .eq('organization_id', organizationId)
        .eq('is_demo', isDemo)
        .eq('status', 'active')
        .lte('starts_at', nowIso)
        .or(
          `expires_at.is.null,expires_at.gt.${startsAt}`
        )
        .neq('id', newRule.id)

    if (currentAlignmentError) {
      return organizationFailure(
        'The scheduled organization rule was created, but the current override could not be aligned to its start date. Review pricing rules before publishing another change.',
        organizationId,
        environment
      )
    }
  } else {
    const nowIso = now.toISOString()

    const { error: futureRetirementError } =
      await admin
        .from('pricing_rules')
        .update({
          status: 'inactive',
          updated_by: ownerResult.user.id,
        })
        .eq('scope_type', 'organization')
        .eq('organization_id', organizationId)
        .eq('is_demo', isDemo)
        .eq('status', 'active')
        .gt('starts_at', nowIso)
        .neq('id', newRule.id)

    if (futureRetirementError) {
      return organizationFailure(
        'The new organization rule is active, but a future scheduled override could not be retired. Review pricing rules before publishing another change.',
        organizationId,
        environment
      )
    }

    const { error: currentRetirementError } =
      await admin
        .from('pricing_rules')
        .update({
          status: 'inactive',
          expires_at: startsAt,
          updated_by: ownerResult.user.id,
        })
        .eq('scope_type', 'organization')
        .eq('organization_id', organizationId)
        .eq('is_demo', isDemo)
        .eq('status', 'active')
        .lte('starts_at', nowIso)
        .neq('id', newRule.id)

    if (currentRetirementError) {
      return organizationFailure(
        'The new organization rule is active, but an older override could not be retired. Review pricing rules before publishing another change.',
        organizationId,
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
    } for the selected organization${
      parsedExpiresAt
        ? ` until ${parsedExpiresAt.toLocaleString(
            'en-US'
          )}`
        : ''
    }.`,
    organizationId,
    environment,
  }
}

export async function retireOrganizationPricingAction(
  _previousState: OwnerOrganizationPricingActionState,
  formData: FormData
): Promise<OwnerOrganizationPricingActionState> {
  const organizationId = readFormValue(
    formData,
    'organizationId'
  )

  const environment = parseEnvironment(
    readFormValue(formData, 'environment')
  )

  if (!organizationId) {
    return organizationFailure(
      'Choose an organization before retiring pricing.',
      organizationId,
      environment
    )
  }

  const ownerResult = await getOwnerUser()

  if (ownerResult.status !== 'success') {
    return organizationFailure(
      ownerResult.message,
      organizationId,
      environment
    )
  }

  const isDemo = environment === 'demo'
  const retiredAt = new Date().toISOString()
  const admin = createAdminClient()

  const { data: retiredFutureRules, error: futureRetirementError } =
    await admin
      .from('pricing_rules')
      .update({
        status: 'inactive',
        updated_by: ownerResult.user.id,
      })
      .eq('scope_type', 'organization')
      .eq('organization_id', organizationId)
      .eq('is_demo', isDemo)
      .eq('status', 'active')
      .gt('starts_at', retiredAt)
      .select('id')
      .returns<Array<{ id: string }>>()

  if (futureRetirementError) {
    return organizationFailure(
      'The scheduled organization pricing override could not be retired.',
      organizationId,
      environment
    )
  }

  const { data: retiredCurrentRules, error: currentRetirementError } =
    await admin
      .from('pricing_rules')
      .update({
        status: 'inactive',
        expires_at: retiredAt,
        updated_by: ownerResult.user.id,
      })
      .eq('scope_type', 'organization')
      .eq('organization_id', organizationId)
      .eq('is_demo', isDemo)
      .eq('status', 'active')
      .lte('starts_at', retiredAt)
      .select('id')
      .returns<Array<{ id: string }>>()

  if (currentRetirementError) {
    return organizationFailure(
      'The active organization pricing override could not be retired.',
      organizationId,
      environment
    )
  }

  const retiredRuleCount =
    (retiredFutureRules?.length ?? 0) +
    (retiredCurrentRules?.length ?? 0)

  if (retiredRuleCount === 0) {
    return organizationFailure(
      'This organization does not have an active or scheduled pricing override.',
      organizationId,
      environment
    )
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/owner/pricing')

  return {
    success: true,
    message:
      'The organization pricing override was retired. Campaigns without a campaign-specific override will return to town, state, platform, or the $20 / 20% application fallback.',
    organizationId,
    environment,
  }
}
