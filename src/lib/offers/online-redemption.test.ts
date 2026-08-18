import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getOnlineOfferDestination,
  normalizeDiscountCode,
  normalizeOnlineOfferUrl,
  validateOnlineRedemptionInput,
} from './online-redemption'

test('normalizes store URLs without a protocol to HTTPS', () => {
  assert.equal(
    normalizeOnlineOfferUrl('shop.example.com/collections/accessories'),
    'https://shop.example.com/collections/accessories'
  )
})

test('preserves valid HTTP and HTTPS URLs', () => {
  assert.equal(
    normalizeOnlineOfferUrl('https://shop.example.com/deals?code=SAVE10#details'),
    'https://shop.example.com/deals?code=SAVE10'
  )
  assert.equal(
    normalizeOnlineOfferUrl('http://localhost:3000/store'),
    'http://localhost:3000/store'
  )
})

test('rejects unsafe and malformed store destinations', () => {
  assert.equal(normalizeOnlineOfferUrl('javascript:alert(1)'), null)
  assert.equal(normalizeOnlineOfferUrl('https://user:pass@example.com'), null)
  assert.equal(normalizeOnlineOfferUrl('not a valid host'), null)
})

test('preserves discount code casing while normalizing whitespace', () => {
  assert.equal(normalizeDiscountCode('  RaiseHub  15  '), 'RaiseHub 15')
})

test('keeps existing in-person offers compatible and clears online fields', () => {
  assert.deepEqual(
    validateOnlineRedemptionInput({
      redemptionChannel: 'in_person',
      onlineStoreUrl: 'shop.example.com',
      discountCode: 'SAVE10',
    }),
    {
      ok: true,
      value: {
        redemptionChannel: 'in_person',
        onlineStoreUrl: null,
        discountCode: null,
        discountUrl: null,
        onlineRedemptionInstructions: null,
      },
    }
  )
})

test('requires an online destination for online-capable offers', () => {
  assert.deepEqual(
    validateOnlineRedemptionInput({ redemptionChannel: 'online' }),
    {
      ok: false,
      error: 'Online offers need a store URL or a discount link.',
    }
  )
})

test('accepts an online store URL with an optional discount code', () => {
  assert.deepEqual(
    validateOnlineRedemptionInput({
      redemptionChannel: 'both',
      onlineStoreUrl: 'shop.example.com',
      discountCode: 'RaiseHub15',
      onlineRedemptionInstructions: 'Add eligible accessories to your cart.',
    }),
    {
      ok: true,
      value: {
        redemptionChannel: 'both',
        onlineStoreUrl: 'https://shop.example.com/',
        discountCode: 'RaiseHub15',
        discountUrl: null,
        onlineRedemptionInstructions: 'Add eligible accessories to your cart.',
      },
    }
  )
})

test('uses a supplied discount URL before the normal store URL', () => {
  assert.equal(
    getOnlineOfferDestination({
      onlineStoreUrl: 'https://shop.example.com/',
      discountUrl: 'https://shop.example.com/discount/RAISEHUB15',
    }),
    'https://shop.example.com/discount/RAISEHUB15'
  )
})

test('opening a store destination is separate from redemption state', () => {
  const result = validateOnlineRedemptionInput({
    redemptionChannel: 'online',
    discountUrl: 'shop.example.com/discount/RAISEHUB15',
  })

  assert.equal(result.ok, true)
  assert.equal('redeemedAt' in (result.ok ? result.value : {}), false)
})
