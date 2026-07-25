import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type PaymentRiskPolicy = {
  standard_hold_days: number
  first_payout_hold_days: number
  reserve_percent_bps: number
  reserve_days: number
  minimum_loss_tolerance_cents: number
  lifetime_payout_tolerance_bps: number
  pattern_count_threshold: number
  pattern_rate_threshold_bps: number
}

export type FinancialHealthSummary = {
  held_cents: number
  reserve_cents: number
  eligible_cents: number
  refund_cents: number
  open_dispute_count: number
  open_dispute_cents: number
  lost_dispute_cents: number
  platform_loss_cents: number
  negative_organization_count: number
  threshold_organization_count: number
  upcoming_reserve_release_cents: number
  manual_review_count: number
}

export type OrganizationRiskRow = {
  id: string
  name: string
  override: Record<string, unknown> | null
}

export async function getOwnerPaymentRiskSnapshot() {
  const admin = createAdminClient() as any
  const [policyResult, healthResult, organizationsResult, overridesResult, auditResult] =
    await Promise.all([
      admin.from('platform_payment_risk_policy').select('*').eq('singleton', true).single(),
      admin.from('owner_financial_health_summary').select('*').single(),
      admin.from('organizations').select('id, name').order('name'),
      admin.from('organization_payment_risk_overrides').select('*'),
      admin
        .from('payment_risk_audit_events')
        .select('id, organization_id, action_type, previous_value, new_value, reason, actor_profile_id, related_resource_type, related_resource_id, created_at')
        .order('created_at', { ascending: false })
        .limit(25),
    ])

  const error =
    policyResult.error ||
    healthResult.error ||
    organizationsResult.error ||
    overridesResult.error ||
    auditResult.error

  if (error) throw error

  const overrides = new Map(
    (overridesResult.data ?? []).map((row: any) => [row.organization_id, row])
  )

  return {
    policy: policyResult.data as PaymentRiskPolicy,
    health: healthResult.data as FinancialHealthSummary,
    organizations: (organizationsResult.data ?? []).map((organization: any) => ({
      ...organization,
      override: overrides.get(organization.id) ?? null,
    })) as OrganizationRiskRow[],
    auditEvents: auditResult.data ?? [],
  }
}
