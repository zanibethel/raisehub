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

export type PublishCampaignPricingActionState = {
  success: boolean
  message: string | null
  campaignId: string | null
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

const INITIAL_CAMPAIGN_STATE: PublishCampaignPricingActionState = {
  success: false,
  message: null,
  campaignId: null,
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

function campaignFailure(
  message: string,
  campaignId: string | null = null,
  environment: OwnerPricingEnvironment | null = null
): PublishCampaignPricingActionState {
  return {
    success: false,
    message,
    campaignId,
    environment,
  }
}

async function getOwnerUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      error: 'Sign in before changing pricing.',
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
      user: null,
      error: 'Unable to verify owner access.',
    }
  }

  if (profile.role !== 'owner') {
    return {
      user: null,
      error: 'Owner access is required.',
    }
  }

  return {
    user,
    error: null,
  }
}

// =============================================================================
// Platform pricing action
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

  const ownerResult = await getOwnerUser()

  if (!ownerResult.user) {
    return failure(
      ownerResult.error,
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
        created_by: ownerResult.user.id,
        updated_by: ownerResult.user.id,
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
        updated_by: ownerResult.user.id,
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

// =============================================================================
// Campaign pricing action
// =============================================================================

export async function publishCampaignPricingAction(
  _previousState: PublishCampaignPricingActionState =
    INITIAL_CAMPAIGN_STATE,
  formData: FormData
): Promise<PublishCampaignPricingActionState> {
  const campaignId =
    readFormValue(formData, 'campaignId')

  if (!campaignId) {
    return campaignFailure(
      'Choose a campaign before publishing campaign pricing.'
    )
  }

  const environmentValue =
    readFormValue(formData, 'environment')

  if (!isPricingEnvironment(environmentValue)) {
    return campaignFailure(
      'Choose Production or Demo pricing.',
      campaignId
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
    return campaignFailure(
      'Pass price must be greater than $0 and no more than $1,000.',
      campaignId,
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
    return campaignFailure(
      'RaiseHub fee must be between 0% and 100%.',
      campaignId,
      environmentValue
    )
  }

  const reason =
    readFormValue(formData, 'reason') ||
    'Owner-managed campaign pricing override'

  const internalNote =
    readFormValue(formData, 'internalNote') ||
    null

  const ownerResult = await getOwnerUser()

  if (!ownerResult.user) {
    return campaignFailure(
      ownerResult.error,
      campaignId,
      environmentValue
    )
  }

  const isDemo = environmentValue === 'demo'
  const startsAt = new Date().toISOString()
  const admin = createAdminClient()

  const { data: campaign, error: campaignError } =
    await admin
      .from('campaigns')
      .select('id, is_demo')
      .eq('id', campaignId)
      .single<{
        id: string
        is_demo: boolean
      }>()

  if (campaignError || !campaign) {
    return campaignFailure(
      'The selected campaign could not be found.',
      campaignId,
      environmentValue
    )
  }

  if (campaign.is_demo !== isDemo) {
    return campaignFailure(
      `The selected campaign does not belong to the ${environmentValue} environment.`,
      campaignId,
      environmentValue
    )
  }

  // Insert the replacement first so the campaign never loses its override.
  const { data: newRule, error: insertError } =
    await admin
      .from('pricing_rules')
      .insert({
        scope_type: 'campaign',
        campaign_id: campaignId,
        pass_price: passPrice,
        platform_fee_percent:
          platformFeePercent,
        status: 'active',
        starts_at: startsAt,
        reason,
        internal_note: internalNote,
        created_by: ownerResult.user.id,
        updated_by: ownerResult.user.id,
        is_demo: isDemo,
        demo_group: null,
      })
      .select('id')
      .single<{ id: string }>()

  if (insertError || !newRule) {
    return campaignFailure(
      'The campaign pricing override could not be published.',
      campaignId,
      environmentValue
    )
  }

  // Retire older overrides only after the replacement exists.
  const { error: retirementError } =
    await admin
      .from('pricing_rules')
      .update({
        status: 'inactive',
        expires_at: startsAt,
        updated_by: ownerResult.user.id,
      })
      .eq('scope_type', 'campaign')
      .eq('campaign_id', campaignId)
      .eq('is_demo', isDemo)
      .eq('status', 'active')
      .neq('id', newRule.id)

  if (retirementError) {
    return campaignFailure(
      'The new campaign rule is active, but the older override could not be retired. Review pricing rules before publishing another change.',
      campaignId,
      environmentValue
    )
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/owner/pricing')

  return {
    success: true,
    message: `$${passPrice.toFixed(
      2
    )} with a ${platformFeePercent.toFixed(
      2
    )}% RaiseHub fee is now active for the selected campaign.`,
    campaignId,
    environment: environmentValue,
  }
}
