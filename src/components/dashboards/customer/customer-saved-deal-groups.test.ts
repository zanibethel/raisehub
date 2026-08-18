import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getCustomerReadyToUseDealCountLabel,
  getCustomerSavedDealGroupCountLabel,
  getCustomerSavedDealGroups,
  getCustomerUsedDealCountLabel,
} from './customer-saved-deal-groups'

import type {
  CustomerSavedDeal,
} from './customer-saved-deals'
import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

function createDeal({
  id,
  isRedeemed,
  isRedeemable,
}: {
  id: string
  isRedeemed: boolean
  isRedeemable: boolean
}): CustomerSavedDeal {
  return {
    offer: {
      id,
    } as CustomerDashboardOffer,
    isRedeemed,
    isRedeemable,
  }
}

test('separates currently redeemable deals from unavailable deals', () => {
  const unusedReadyDeal = createDeal({
    id: 'unused-ready',
    isRedeemed: false,
    isRedeemable: true,
  })
  const redeemedReusableDeal = createDeal({
    id: 'redeemed-reusable',
    isRedeemed: true,
    isRedeemable: true,
  })
  const redeemedUnavailableDeal = createDeal({
    id: 'redeemed-unavailable',
    isRedeemed: true,
    isRedeemable: false,
  })

  const groups = getCustomerSavedDealGroups([
    unusedReadyDeal,
    redeemedReusableDeal,
    redeemedUnavailableDeal,
  ])

  assert.deepEqual(groups.readyToUse, [unusedReadyDeal, redeemedReusableDeal])
  assert.deepEqual(groups.used, [redeemedUnavailableDeal])
})

test('preserves the original order within each current-availability group', () => {
  const groups = getCustomerSavedDealGroups([
    createDeal({ id: 'ready-first', isRedeemed: false, isRedeemable: true }),
    createDeal({ id: 'unavailable-first', isRedeemed: true, isRedeemable: false }),
    createDeal({ id: 'ready-second', isRedeemed: true, isRedeemable: true }),
    createDeal({ id: 'unavailable-second', isRedeemed: true, isRedeemable: false }),
  ])

  assert.deepEqual(
    groups.readyToUse.map(({ offer }) => offer.id),
    ['ready-first', 'ready-second']
  )
  assert.deepEqual(
    groups.used.map(({ offer }) => offer.id),
    ['unavailable-first', 'unavailable-second']
  )
})

test('returns empty groups when there are no saved deals', () => {
  assert.deepEqual(getCustomerSavedDealGroups([]), {
    readyToUse: [],
    used: [],
  })
})

test('uses singular generic group wording', () => {
  assert.equal(
    getCustomerSavedDealGroupCountLabel({
      count: 1,
      singularLabel: 'deal',
      pluralLabel: 'deals',
    }),
    '1 deal'
  )
})

test('uses plural generic group wording', () => {
  assert.equal(
    getCustomerSavedDealGroupCountLabel({
      count: 0,
      singularLabel: 'deal',
      pluralLabel: 'deals',
    }),
    '0 deals'
  )
  assert.equal(
    getCustomerSavedDealGroupCountLabel({
      count: 4,
      singularLabel: 'deal',
      pluralLabel: 'deals',
    }),
    '4 deals'
  )
})

test('formats ready-to-use deal counts', () => {
  assert.equal(getCustomerReadyToUseDealCountLabel(1), '1 deal')
  assert.equal(getCustomerReadyToUseDealCountLabel(3), '3 deals')
})

test('formats unavailable-deal counts', () => {
  assert.equal(getCustomerUsedDealCountLabel(1), '1 unavailable deal')
  assert.equal(getCustomerUsedDealCountLabel(5), '5 unavailable deals')
})
