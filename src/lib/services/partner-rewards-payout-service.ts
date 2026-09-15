import 'server-only'

import { getBusinessPayoutStatus } from '@/lib/stripe/business-connect'
import { getStripeClient } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type PartnerRewardPayoutRow = {
  id: string
  awardId: string
  businessId: string
  businessName: string
  rewardPeriodId: string
  periodLabel: string
  amountCents: number
  currency: string
  status: string
  stripeTransferId: string | null
  failureMessage: string | null
  submittedAt: string | null
  paidAt: string | null
  failedAt: string | null
  createdAt: string
}

export type PartnerRewardPayableAward = {
  awardId: string
  businessId: string
  businessName: string
  rewardPeriodId: string
  periodLabel: string
  awardCents: number
  eligiblePoints: number
  finalShareFraction: number | null
  stripePayoutReadyAtClose: boolean
  payout: PartnerRewardPayoutRow | null
}

type RawPayoutRow = {
  id: string
  award_id: string
  reward_period_id: string
  business_id: string
  amount_cents: number | string
  currency: string
  status: string
  stripe_transfer_id: string | null
  failure_message: string | null
  submitted_at: string | null
  paid_at: string | null
  failed_at: string | null
  created_at: string
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function listFinalizedPartnerRewardAwards(): Promise<PartnerRewardPayableAward[]> {
  const admin = createAdminClient() as any
  const { data: awards, error } = await admin
    .from('partner_reward_quarter_awards')
    .select('id, reward_period_id, business_id, eligible_points, final_share_fraction, award_cents, stripe_payout_ready_at_close, finalized_at')
    .gt('award_cents', 0)
    .order('finalized_at', { ascending: false })

  if (error) throw error
  if (!awards?.length) return []

  const businessIds = [...new Set(awards.map((award: any) => award.business_id))]
  const periodIds = [...new Set(awards.map((award: any) => award.reward_period_id))]
  const awardIds = awards.map((award: any) => award.id)

  const [{ data: businesses }, { data: periods }, { data: payouts }] = await Promise.all([
    admin.from('businesses').select('id, name').in('id', businessIds),
    admin.from('partner_reward_periods').select('id, label').in('id', periodIds),
    admin
      .from('partner_reward_payouts')
      .select('id, award_id, reward_period_id, business_id, amount_cents, currency, status, stripe_transfer_id, failure_message, submitted_at, paid_at, failed_at, created_at')
      .in('award_id', awardIds),
  ])

  const businessNameById = new Map<string, string>((businesses ?? []).map((row: any) => [String(row.id), String(row.name)]))
  const periodLabelById = new Map<string, string>((periods ?? []).map((row: any) => [String(row.id), String(row.label)]))
  const payoutByAwardId = new Map<string, RawPayoutRow>((payouts ?? []).map((row: any) => [String(row.award_id), row as RawPayoutRow]))

  return awards.map((award: any) => {
    const payout = payoutByAwardId.get(String(award.id)) ?? null
    const normalizedPayout: PartnerRewardPayoutRow | null = payout
      ? {
          id: payout.id,
          awardId: payout.award_id,
          businessId: payout.business_id,
          businessName: businessNameById.get(payout.business_id) ?? 'Business',
          rewardPeriodId: payout.reward_period_id,
          periodLabel: periodLabelById.get(payout.reward_period_id) ?? 'Quarter',
          amountCents: numberValue(payout.amount_cents),
          currency: payout.currency,
          status: payout.status,
          stripeTransferId: payout.stripe_transfer_id,
          failureMessage: payout.failure_message,
          submittedAt: payout.submitted_at,
          paidAt: payout.paid_at,
          failedAt: payout.failed_at,
          createdAt: payout.created_at,
        }
      : null

    return {
      awardId: award.id,
      businessId: award.business_id,
      businessName: businessNameById.get(String(award.business_id)) ?? 'Business',
      rewardPeriodId: award.reward_period_id,
      periodLabel: periodLabelById.get(String(award.reward_period_id)) ?? 'Quarter',
      awardCents: numberValue(award.award_cents),
      eligiblePoints: numberValue(award.eligible_points),
      finalShareFraction: award.final_share_fraction === null ? null : numberValue(award.final_share_fraction),
      stripePayoutReadyAtClose: Boolean(award.stripe_payout_ready_at_close),
      payout: normalizedPayout,
    }
  })
}

export async function executePartnerRewardPayout(
  awardId: string,
  requestedBy: string
): Promise<{ ok: true; payoutId: string; stripeTransferId: string } | { ok: false; error: string }> {
  const cleanAwardId = awardId.trim()
  if (!cleanAwardId) return { ok: false, error: 'Partner Reward award was not found.' }

  const admin = createAdminClient() as any
  const { data: award, error: awardError } = await admin
    .from('partner_reward_quarter_awards')
    .select('id, reward_period_id, business_id, award_cents, finalized_at')
    .eq('id', cleanAwardId)
    .maybeSingle()

  if (awardError || !award) return { ok: false, error: 'Partner Reward award was not found.' }
  if (!award.finalized_at) return { ok: false, error: 'Only finalized quarter awards can be paid.' }

  const amountCents = numberValue(award.award_cents)
  if (!Number.isInteger(amountCents) || amountCents <= 0) return { ok: false, error: 'This award does not have a payable cash amount.' }

  const { data: period } = await admin
    .from('partner_reward_periods')
    .select('status, label')
    .eq('id', award.reward_period_id)
    .maybeSingle()

  if (period?.status !== 'finalized') return { ok: false, error: 'The reward quarter must be finalized before payout.' }

  const { data: existingPayout, error: existingError } = await admin
    .from('partner_reward_payouts')
    .select('id, status, stripe_transfer_id')
    .eq('award_id', award.id)
    .maybeSingle()

  if (existingError) return { ok: false, error: 'RaiseHub could not check payout history.' }
  if (existingPayout && existingPayout.status !== 'failed') {
    return { ok: false, error: existingPayout.stripe_transfer_id ? 'This award has already been transferred to Stripe.' : 'A payout is already being processed for this award.' }
  }

  const readiness = await getBusinessPayoutStatus(award.business_id, { refreshStripe: true })
  if (!readiness?.payoutReady) return { ok: false, error: readiness?.blockers?.[0] ?? 'The business is not ready to receive Stripe payouts.' }

  const { data: stripeAccount, error: stripeAccountError } = await admin
    .from('business_stripe_accounts')
    .select('stripe_account_id, default_currency')
    .eq('business_id', award.business_id)
    .maybeSingle()

  if (stripeAccountError || !stripeAccount?.stripe_account_id) return { ok: false, error: 'The business Stripe payout account was not found.' }

  const currency = String(stripeAccount.default_currency ?? 'usd').toLowerCase()
  const idempotencyKey = `raisehub-partner-reward-${award.id}`
  const now = new Date().toISOString()
  let payoutId: string

  if (existingPayout?.status === 'failed') {
    const { error: resetError } = await admin
      .from('partner_reward_payouts')
      .update({ status: 'pending', failure_code: null, failure_message: null, failed_at: null, updated_at: now, requested_by: requestedBy, stripe_account_id: stripeAccount.stripe_account_id })
      .eq('id', existingPayout.id)
    if (resetError) return { ok: false, error: 'RaiseHub could not retry this payout.' }
    payoutId = existingPayout.id
  } else {
    const { data: inserted, error: insertError } = await admin
      .from('partner_reward_payouts')
      .insert({
        award_id: award.id,
        reward_period_id: award.reward_period_id,
        business_id: award.business_id,
        stripe_account_id: stripeAccount.stripe_account_id,
        amount_cents: amountCents,
        currency,
        status: 'pending',
        idempotency_key: idempotencyKey,
        requested_by: requestedBy,
      })
      .select('id')
      .single()

    if (insertError || !inserted?.id) {
      if (String(insertError?.code) === '23505') return { ok: false, error: 'A payout already exists for this finalized award.' }
      return { ok: false, error: 'RaiseHub could not create the payout record.' }
    }
    payoutId = inserted.id
  }

  try {
    const stripe = getStripeClient()
    const transfer = await stripe.transfers.create(
      {
        amount: amountCents,
        currency,
        destination: stripeAccount.stripe_account_id,
        transfer_group: `partner_rewards_${award.reward_period_id}`,
        description: `RaiseHub Partner Rewards ${period?.label ?? 'quarter'}`.slice(0, 200),
        metadata: {
          raisehub_partner_reward_award_id: award.id,
          raisehub_partner_reward_payout_id: payoutId,
          raisehub_business_id: award.business_id,
          raisehub_reward_period_id: award.reward_period_id,
        },
      },
      { idempotencyKey }
    )

    const submittedAt = new Date().toISOString()
    await admin
      .from('partner_reward_payouts')
      .update({ status: 'submitted', stripe_transfer_id: transfer.id, submitted_at: submittedAt, updated_at: submittedAt })
      .eq('id', payoutId)

    return { ok: true, payoutId, stripeTransferId: transfer.id }
  } catch (error) {
    const failedAt = new Date().toISOString()
    const message = error instanceof Error ? error.message : 'Stripe transfer failed.'
    const code = typeof error === 'object' && error && 'code' in error ? String((error as any).code ?? '') : null

    await admin
      .from('partner_reward_payouts')
      .update({ status: 'failed', failure_code: code || null, failure_message: message.slice(0, 1000), failed_at: failedAt, updated_at: failedAt })
      .eq('id', payoutId)

    console.error('Partner Reward Stripe transfer failed', { awardId: award.id, payoutId, businessId: award.business_id, error })
    return { ok: false, error: message }
  }
}
