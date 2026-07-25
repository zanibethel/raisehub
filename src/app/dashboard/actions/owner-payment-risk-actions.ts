'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type ActionState = { ok: boolean; message: string }

async function requireOwner() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('You must be signed in.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'owner') {
    throw new Error('Owner capability is required.')
  }

  return profile.id as string
}

function requiredReason(formData: FormData) {
  const reason = String(formData.get('reason') ?? '').trim()
  if (reason.length < 8 || reason.length > 500) {
    throw new Error('Enter a reason between 8 and 500 characters.')
  }
  return reason
}

function integer(formData: FormData, name: string, min: number, max: number) {
  const raw = String(formData.get(name) ?? '').trim()
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be a whole number from ${min} to ${max}.`)
  }
  return value
}

function optionalInteger(formData: FormData, name: string, min: number, max: number) {
  const raw = String(formData.get(name) ?? '').trim()
  if (!raw) return ''
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be blank or a whole number from ${min} to ${max}.`)
  }
  return value
}

function requestKey(formData: FormData, prefix: string) {
  const supplied = String(formData.get('request_id') ?? '').trim()
  return `${prefix}:${supplied || randomUUID()}`
}

export async function updateGlobalPaymentRiskPolicy(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actorProfileId = await requireOwner()
    const reason = requiredReason(formData)
    const confirmation = String(formData.get('confirmation') ?? '')
    if (confirmation !== 'CONFIRM') throw new Error('Type CONFIRM to save this policy change.')

    const policy = {
      standard_hold_days: integer(formData, 'standard_hold_days', 0, 90),
      first_payout_hold_days: integer(formData, 'first_payout_hold_days', 0, 90),
      reserve_percent_bps: integer(formData, 'reserve_percent_bps', 0, 10000),
      reserve_days: integer(formData, 'reserve_days', 0, 365),
      minimum_loss_tolerance_cents: integer(formData, 'minimum_loss_tolerance_cents', 0, 100000000),
      lifetime_payout_tolerance_bps: integer(formData, 'lifetime_payout_tolerance_bps', 0, 10000),
      pattern_count_threshold: integer(formData, 'pattern_count_threshold', 1, 1000),
      pattern_rate_threshold_bps: integer(formData, 'pattern_rate_threshold_bps', 0, 10000),
    }

    const admin = createAdminClient() as any
    const { error } = await admin.rpc('owner_update_global_payment_risk_policy', {
      p_actor_profile_id: actorProfileId,
      p_reason: reason,
      p_idempotency_key: requestKey(formData, 'global-policy'),
      p_policy: policy,
    })
    if (error) throw error

    revalidatePath('/dashboard')
    return { ok: true, message: 'Global payment-risk policy updated and audited.' }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Policy update failed.' }
  }
}

export async function upsertOrganizationPaymentRiskOverride(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actorProfileId = await requireOwner()
    const reason = requiredReason(formData)
    const organizationId = String(formData.get('organization_id') ?? '')
    if (!organizationId) throw new Error('Choose an organization.')

    const payoutsPaused = formData.get('payouts_paused') === 'on'
    const manualApproval = formData.get('manual_payout_approval_required') === 'on'
    const highImpact = payoutsPaused || formData.get('lowering_protection') === 'on'
    if (highImpact && String(formData.get('confirmation') ?? '') !== 'CONFIRM') {
      throw new Error('Type CONFIRM for payout pauses or reduced protections.')
    }

    const override = {
      standard_hold_days: optionalInteger(formData, 'standard_hold_days', 0, 90),
      first_payout_hold_days: optionalInteger(formData, 'first_payout_hold_days', 0, 90),
      reserve_percent_bps: optionalInteger(formData, 'reserve_percent_bps', 0, 10000),
      reserve_days: optionalInteger(formData, 'reserve_days', 0, 365),
      minimum_loss_tolerance_cents: optionalInteger(formData, 'minimum_loss_tolerance_cents', 0, 100000000),
      lifetime_payout_tolerance_bps: optionalInteger(formData, 'lifetime_payout_tolerance_bps', 0, 10000),
      payouts_paused: payoutsPaused,
      manual_payout_approval_required: manualApproval,
    }

    const admin = createAdminClient() as any
    const { error } = await admin.rpc('owner_upsert_organization_payment_risk_override', {
      p_actor_profile_id: actorProfileId,
      p_organization_id: organizationId,
      p_reason: reason,
      p_idempotency_key: requestKey(formData, `organization-policy:${organizationId}`),
      p_override: override,
    })
    if (error) throw error

    revalidatePath('/dashboard')
    return { ok: true, message: 'Organization override saved and audited.' }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Override update failed.' }
  }
}

export async function resetOrganizationPaymentRiskOverride(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actorProfileId = await requireOwner()
    const reason = requiredReason(formData)
    const organizationId = String(formData.get('organization_id') ?? '')
    if (!organizationId) throw new Error('Choose an organization.')
    if (String(formData.get('confirmation') ?? '') !== 'RESET') {
      throw new Error('Type RESET to return this organization to platform defaults.')
    }

    const admin = createAdminClient() as any
    const { error } = await admin.rpc('owner_reset_organization_payment_risk_override', {
      p_actor_profile_id: actorProfileId,
      p_organization_id: organizationId,
      p_reason: reason,
      p_idempotency_key: requestKey(formData, `organization-reset:${organizationId}`),
    })
    if (error) throw error

    revalidatePath('/dashboard')
    return { ok: true, message: 'Organization returned to platform defaults. Audit history was preserved.' }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Reset failed.' }
  }
}
