import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type OrganizationPayoutPolicy = {
  standard_hold_days: number
  first_payout_hold_days: number
  reserve_percent_bps: number
  reserve_days: number
  minimum_loss_tolerance_cents: number
  lifetime_payout_tolerance_bps: number
  payouts_paused: boolean
  manual_payout_approval_required: boolean
}

export type OrganizationLedgerEntry = {
  id: string
  entry_type: string
  amount_cents: number
  available_on: string | null
  description: string | null
  created_at: string
}

export type OrganizationTransfer = {
  id: string
  amount_cents: number
  currency: string
  status: string
  failure_message: string | null
  initiated_at: string | null
  completed_at: string | null
  created_at: string
}

export type OrganizationPayoutEvent = {
  id: string
  amount_cents: number
  currency: string
  status: string
  arrival_date: string | null
  failure_message: string | null
  created_at: string
}

export type OrganizationStripeAccount = {
  onboarding_status: string
  details_submitted: boolean
  payouts_enabled: boolean
  charges_enabled: boolean
  disabled_reason: string | null
  requirements_currently_due: unknown[]
} | null

export type OrganizationPayoutSnapshot = {
  ledgerBalanceCents: number
  availableBalanceCents: number
  heldFundsCents: number
  reserveBalanceCents: number
  pendingTransferCents: number
  completedTransferCents: number
  refundTotalCents: number
  disputeTotalCents: number
  nextReleaseAt: string | null
  policy: OrganizationPayoutPolicy
  stripeAccount: OrganizationStripeAccount
  recentLedgerEntries: OrganizationLedgerEntry[]
  recentTransfers: OrganizationTransfer[]
  recentPayoutEvents: OrganizationPayoutEvent[]
}

export async function getOrganizationPayoutSnapshot(
  organizationId: string
): Promise<OrganizationPayoutSnapshot> {
  const admin = createAdminClient() as any

  const [ledgerResult, transferResult, payoutResult, stripeResult, policyResult] =
    await Promise.all([
      admin
        .from('organization_earnings_ledger')
        .select('id, entry_type, amount_cents, available_on, description, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('organization_transfers')
        .select('id, amount_cents, currency, status, failure_message, initiated_at, completed_at, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(25),
      admin
        .from('organization_payout_events')
        .select('id, amount_cents, currency, status, arrival_date, failure_message, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(25),
      admin
        .from('organization_stripe_accounts')
        .select('onboarding_status, details_submitted, payouts_enabled, charges_enabled, disabled_reason, requirements_currently_due')
        .eq('organization_id', organizationId)
        .maybeSingle(),
      admin.rpc('effective_organization_payment_risk_policy', {
        p_organization_id: organizationId,
      }),
    ])

  const error =
    ledgerResult.error ||
    transferResult.error ||
    payoutResult.error ||
    stripeResult.error ||
    policyResult.error

  if (error) throw error

  const ledger = (ledgerResult.data ?? []) as OrganizationLedgerEntry[]
  const transfers = (transferResult.data ?? []) as OrganizationTransfer[]
  const payouts = (payoutResult.data ?? []) as OrganizationPayoutEvent[]
  const now = Date.now()

  const isAvailable = (entry: OrganizationLedgerEntry) =>
    !entry.available_on || new Date(entry.available_on).getTime() <= now

  const ledgerBalanceCents = ledger.reduce(
    (sum, entry) => sum + Number(entry.amount_cents ?? 0),
    0
  )
  const availableBalanceCents = ledger
    .filter(isAvailable)
    .reduce((sum, entry) => sum + Number(entry.amount_cents ?? 0), 0)
  const heldFundsCents = ledger
    .filter(
      (entry) =>
        entry.entry_type === 'purchase_earning' &&
        entry.available_on &&
        new Date(entry.available_on).getTime() > now
    )
    .reduce((sum, entry) => sum + Math.max(Number(entry.amount_cents ?? 0), 0), 0)
  const reserveBalanceCents = ledger
    .filter(
      (entry) =>
        entry.entry_type === 'reserve_release' &&
        entry.available_on &&
        new Date(entry.available_on).getTime() > now
    )
    .reduce((sum, entry) => sum + Math.max(Number(entry.amount_cents ?? 0), 0), 0)
  const pendingTransferCents = transfers
    .filter((transfer) => ['pending', 'submitted'].includes(transfer.status))
    .reduce((sum, transfer) => sum + Number(transfer.amount_cents ?? 0), 0)
  const completedTransferCents = transfers
    .filter((transfer) => transfer.status === 'completed')
    .reduce((sum, transfer) => sum + Number(transfer.amount_cents ?? 0), 0)
  const refundTotalCents = Math.abs(
    ledger
      .filter((entry) => entry.entry_type === 'refund')
      .reduce((sum, entry) => sum + Number(entry.amount_cents ?? 0), 0)
  )
  const disputeTotalCents = Math.abs(
    ledger
      .filter((entry) => entry.entry_type === 'dispute')
      .reduce((sum, entry) => sum + Number(entry.amount_cents ?? 0), 0)
  )
  const futureReleases = ledger
    .filter(
      (entry) =>
        entry.available_on &&
        new Date(entry.available_on).getTime() > now &&
        ['purchase_earning', 'reserve_release'].includes(entry.entry_type)
    )
    .map((entry) => entry.available_on as string)
    .sort()

  const rawPolicy = Array.isArray(policyResult.data)
    ? policyResult.data[0]
    : policyResult.data

  return {
    ledgerBalanceCents,
    availableBalanceCents,
    heldFundsCents,
    reserveBalanceCents,
    pendingTransferCents,
    completedTransferCents,
    refundTotalCents,
    disputeTotalCents,
    nextReleaseAt: futureReleases[0] ?? null,
    policy: rawPolicy as OrganizationPayoutPolicy,
    stripeAccount: stripeResult.data as OrganizationStripeAccount,
    recentLedgerEntries: ledger.slice(0, 12),
    recentTransfers: transfers.slice(0, 10),
    recentPayoutEvents: payouts.slice(0, 10),
  }
}
