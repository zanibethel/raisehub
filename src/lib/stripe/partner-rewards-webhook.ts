import 'server-only'

import type Stripe from 'stripe'

function expandableId(value: string | { id: string } | null | undefined) {
  if (typeof value === 'string') return value
  return value?.id ?? null
}

function connectOnboardingStatus(account: Stripe.Account) {
  if (account.charges_enabled && account.payouts_enabled) return 'enabled'
  if (account.requirements?.disabled_reason) return 'restricted'
  if (account.details_submitted) return 'in_progress'
  return 'not_started'
}

async function synchronizeBusinessConnectedAccount(admin: any, event: Stripe.Event) {
  if (event.type !== 'account.updated') return false

  const account = event.data.object as Stripe.Account
  if (!account.id?.startsWith('acct_')) return false

  const { data: existingAccount, error: lookupError } = await admin
    .from('business_stripe_accounts')
    .select('business_id')
    .eq('stripe_account_id', account.id)
    .maybeSingle()

  if (lookupError) throw lookupError
  if (!existingAccount) return false

  const timestamp = new Date().toISOString()
  const { error: updateError } = await admin
    .from('business_stripe_accounts')
    .update({
      livemode: event.livemode,
      onboarding_status: connectOnboardingStatus(account),
      details_submitted: Boolean(account.details_submitted),
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      requirements_currently_due: account.requirements?.currently_due ?? [],
      requirements_eventually_due: account.requirements?.eventually_due ?? [],
      requirements_past_due: account.requirements?.past_due ?? [],
      disabled_reason: account.requirements?.disabled_reason ?? null,
      country: account.country ?? null,
      default_currency: account.default_currency ?? null,
      last_synced_at: timestamp,
      updated_at: timestamp,
    })
    .eq('stripe_account_id', account.id)

  if (updateError) throw updateError
  return true
}

function isTransferEvent(event: Stripe.Event) {
  return (
    event.type === 'transfer.created' ||
    event.type === 'transfer.updated' ||
    event.type === 'transfer.reversed'
  )
}

async function reconcilePartnerRewardTransfer(admin: any, event: Stripe.Event) {
  if (!isTransferEvent(event)) return false

  const transfer = event.data.object as Stripe.Transfer
  if (!transfer.id?.startsWith('tr_')) return false

  const payoutId = transfer.metadata?.raisehub_partner_reward_payout_id?.trim() || null
  const awardId = transfer.metadata?.raisehub_partner_reward_award_id?.trim() || null

  let lookup = admin
    .from('partner_reward_payouts')
    .select('id, award_id, stripe_account_id, stripe_transfer_id, status, submitted_at, reversed_at')

  if (payoutId) {
    lookup = lookup.eq('id', payoutId)
  } else if (awardId) {
    lookup = lookup.eq('award_id', awardId)
  } else {
    lookup = lookup.eq('stripe_transfer_id', transfer.id)
  }

  const { data: payout, error: lookupError } = await lookup.maybeSingle()
  if (lookupError) throw lookupError
  if (!payout) return false

  const destinationId = expandableId(transfer.destination)
  if (destinationId && destinationId !== payout.stripe_account_id) {
    throw new Error('Partner Reward transfer destination does not match payout ledger')
  }

  if (payout.stripe_transfer_id && payout.stripe_transfer_id !== transfer.id) {
    throw new Error('Partner Reward payout is already linked to a different Stripe transfer')
  }

  const timestamp = new Date().toISOString()
  const reversed = event.type === 'transfer.reversed' || Boolean(transfer.reversed)

  if (reversed) {
    const { error: updateError } = await admin
      .from('partner_reward_payouts')
      .update({
        stripe_transfer_id: transfer.id,
        status: 'reversed',
        reversed_at: payout.reversed_at ?? timestamp,
        failure_code: 'stripe_transfer_reversed',
        failure_message: 'Stripe reversed this Partner Reward transfer.',
        updated_at: timestamp,
      })
      .eq('id', payout.id)

    if (updateError) throw updateError
    return true
  }

  if (payout.status === 'reversed') return true

  const { error: updateError } = await admin
    .from('partner_reward_payouts')
    .update({
      stripe_transfer_id: transfer.id,
      status: 'submitted',
      submitted_at: payout.submitted_at ?? timestamp,
      failure_code: null,
      failure_message: null,
      failed_at: null,
      updated_at: timestamp,
    })
    .eq('id', payout.id)

  if (updateError) throw updateError
  return true
}

export async function handlePartnerRewardsStripeEvent(admin: any, event: Stripe.Event) {
  if (await synchronizeBusinessConnectedAccount(admin, event)) return true
  return reconcilePartnerRewardTransfer(admin, event)
}
