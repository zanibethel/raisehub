import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatCustomerRedemptionDate,
  formatCustomerRedemptionTime,
  getCustomerRedemptionBenefitLabel,
  getCustomerRedemptionBusinessName,
  getCustomerRedemptionHistory,
  getCustomerRedemptionMapUrl,
  getCustomerRedemptionOfferTitle,
  getCustomerRedemptionTimestamp,
} from './customer-redemption-history'

import type {
  CustomerRedemptionEvent,
} from './customer-redemption-history'
import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

type OfferOverrides = Partial<CustomerDashboardOffer> & { id: string }

function createOffer({ id, ...overrides }: OfferOverrides): CustomerDashboardOffer {
  return {
    id,
    title: `Offer ${id}`,
    description: null,
    discount: null,
    business_name: `Business ${id}`,
    google_business_name: null,
    google_maps_url: null,
    address: null,
    ...overrides,
  } as CustomerDashboardOffer
}

function createRedemption({
  id,
  offerId,
  createdAt,
  status = 'confirmed',
  ...overrides
}: {
  id: string
  offerId: string
  createdAt: string
  status?: string
} & Partial<CustomerRedemptionEvent>): CustomerRedemptionEvent {
  return {
    id,
    offer_id: offerId,
    created_at: createdAt,
    status,
    ...overrides,
  }
}

test('returns a timestamp for valid redemption dates', () => {
  const value = '2026-07-20T12:30:00.000Z'
  assert.equal(getCustomerRedemptionTimestamp(value), Date.parse(value))
})

test('rejects and safely formats invalid redemption dates', () => {
  assert.equal(getCustomerRedemptionTimestamp('not-a-date'), null)
  assert.equal(formatCustomerRedemptionDate('not-a-date', 'en-US'), 'Date unavailable')
  assert.equal(formatCustomerRedemptionTime('not-a-date', 'en-US'), null)
})

test('formats valid redemption dates for display', () => {
  assert.equal(
    formatCustomerRedemptionDate('2026-07-20T12:00:00.000Z', 'en-US'),
    'Jul 20, 2026'
  )
})

test('builds history from valid redemption events', () => {
  const validOffer = createOffer({ id: 'valid-offer' })
  const history = getCustomerRedemptionHistory({
    offers: [validOffer],
    redemptions: [
      createRedemption({
        id: 'valid-redemption',
        offerId: 'valid-offer',
        createdAt: '2026-07-20T12:00:00.000Z',
      }),
      createRedemption({
        id: 'invalid-redemption',
        offerId: 'valid-offer',
        createdAt: 'invalid-date',
      }),
    ],
  })

  assert.equal(history.length, 1)
  assert.equal(history[0].redemption.id, 'valid-redemption')
  assert.equal(history[0].offer?.id, 'valid-offer')
})

test('preserves multiple uses of the same reusable offer', () => {
  const offer = createOffer({ id: 'reusable' })
  const history = getCustomerRedemptionHistory({
    offers: [offer],
    redemptions: [
      createRedemption({
        id: 'use-1',
        offerId: 'reusable',
        createdAt: '2026-07-19T12:00:00.000Z',
      }),
      createRedemption({
        id: 'use-2',
        offerId: 'reusable',
        createdAt: '2026-07-20T12:00:00.000Z',
      }),
    ],
  })

  assert.equal(history.length, 2)
  assert.deepEqual(history.map((item) => item.redemption.id), ['use-2', 'use-1'])
})

test('sorts redemption history newest first', () => {
  const offers = [
    createOffer({ id: 'oldest' }),
    createOffer({ id: 'newest' }),
    createOffer({ id: 'middle' }),
  ]
  const history = getCustomerRedemptionHistory({
    offers,
    redemptions: [
      createRedemption({ id: 'old', offerId: 'oldest', createdAt: '2026-07-01T12:00:00.000Z' }),
      createRedemption({ id: 'new', offerId: 'newest', createdAt: '2026-07-20T12:00:00.000Z' }),
      createRedemption({ id: 'mid', offerId: 'middle', createdAt: '2026-07-10T12:00:00.000Z' }),
    ],
  })

  assert.deepEqual(
    history.map((item) => item.redemption.offer_id),
    ['newest', 'middle', 'oldest']
  )
})

test('keeps historical snapshot labels when the current offer changes or disappears', () => {
  const redemption = createRedemption({
    id: 'snapshot-use',
    offerId: 'missing-offer',
    createdAt: '2026-07-20T12:00:00.000Z',
    offer_title_snapshot: 'Original Offer',
    benefit_snapshot: '$10 off',
  })

  assert.equal(getCustomerRedemptionOfferTitle(null, redemption), 'Original Offer')
  assert.equal(getCustomerRedemptionBenefitLabel(null, redemption), '$10 off')
})

test('returns an empty history when there are no redemption events', () => {
  assert.deepEqual(
    getCustomerRedemptionHistory({
      offers: [createOffer({ id: 'offer-1' })],
      redemptions: [],
    }),
    []
  )
})

test('uses primary and Google business-name fallbacks', () => {
  assert.equal(
    getCustomerRedemptionBusinessName(
      createOffer({
        id: 'offer-1',
        business_name: '  Community Coffee  ',
        google_business_name: 'Google Coffee',
      })
    ),
    'Community Coffee'
  )

  assert.equal(
    getCustomerRedemptionBusinessName(
      createOffer({
        id: 'offer-2',
        business_name: undefined,
        google_business_name: '  Google Business  ',
      })
    ),
    'Google Business'
  )

  assert.equal(getCustomerRedemptionBusinessName(null), 'Local Business')
})

test('uses safe title and benefit fallbacks', () => {
  const offer = createOffer({ id: 'offer-1', title: '   ', discount: '   ' })
  assert.equal(getCustomerRedemptionOfferTitle(offer), 'Local offer')
  assert.equal(getCustomerRedemptionBenefitLabel(offer), 'RaiseHub member benefit')
})

test('trims current offer titles and benefit labels', () => {
  const offer = createOffer({
    id: 'offer-1',
    title: '  Free Appetizer  ',
    discount: '  One free item  ',
  })

  assert.equal(getCustomerRedemptionOfferTitle(offer), 'Free Appetizer')
  assert.equal(getCustomerRedemptionBenefitLabel(offer), 'One free item')
})

test('preserves complete Google Maps URLs', () => {
  const offer = createOffer({
    id: 'offer-1',
    google_maps_url: '  https://maps.google.com/example  ',
  })
  assert.equal(getCustomerRedemptionMapUrl(offer), 'https://maps.google.com/example')
})

test('adds https to Google Maps URLs missing a protocol', () => {
  const offer = createOffer({
    id: 'offer-1',
    google_maps_url: 'maps.google.com/example',
  })
  assert.equal(getCustomerRedemptionMapUrl(offer), 'https://maps.google.com/example')
})

test('creates a Google Maps search URL from the business address', () => {
  const offer = createOffer({
    id: 'offer-1',
    google_maps_url: undefined,
    address: '  123 Main Street, Lubbock, TX  ',
  })

  assert.equal(
    getCustomerRedemptionMapUrl(offer),
    'https://www.google.com/maps/search/?api=1&query=123%20Main%20Street%2C%20Lubbock%2C%20TX'
  )
})

test('returns no map URL when location information is unavailable', () => {
  assert.equal(getCustomerRedemptionMapUrl(null), null)
})
