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
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Test helpers
// =============================================================================

type OfferOverrides =
  Partial<CustomerDashboardOffer> & {
    id: string
  }

function createOffer({
  id,
  ...overrides
}: OfferOverrides): CustomerDashboardOffer {
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

// =============================================================================
// Date helpers
// =============================================================================

test(
  'returns a timestamp for valid redemption dates',
  () => {
    const value =
      '2026-07-20T12:30:00.000Z'

    assert.equal(
      getCustomerRedemptionTimestamp(
        value
      ),
      Date.parse(value)
    )
  }
)

test(
  'rejects invalid redemption dates',
  () => {
    assert.equal(
      getCustomerRedemptionTimestamp(
        'not-a-date'
      ),
      null
    )

    assert.equal(
      formatCustomerRedemptionDate(
        'not-a-date',
        'en-US'
      ),
      'Date unavailable'
    )

    assert.equal(
      formatCustomerRedemptionTime(
        'not-a-date',
        'en-US'
      ),
      null
    )
  }
)

test(
  'formats valid redemption dates for display',
  () => {
    assert.equal(
      formatCustomerRedemptionDate(
        '2026-07-20T12:00:00.000Z',
        'en-US'
      ),
      'Jul 20, 2026'
    )
  }
)

// =============================================================================
// History construction
// =============================================================================

test(
  'includes only offers with valid redemption dates',
  () => {
    const validOffer =
      createOffer({
        id: 'valid-offer',
      })

    const invalidOffer =
      createOffer({
        id: 'invalid-offer',
      })

    const missingOffer =
      createOffer({
        id: 'missing-offer',
      })

    const history =
      getCustomerRedemptionHistory({
        offers: [
          validOffer,
          invalidOffer,
          missingOffer,
        ],
        redemptionDateByOfferId:
          new Map([
            [
              'valid-offer',
              '2026-07-20T12:00:00.000Z',
            ],
            [
              'invalid-offer',
              'invalid-date',
            ],
          ]),
      })

    assert.equal(
      history.length,
      1
    )

    assert.equal(
      history[0].offer.id,
      'valid-offer'
    )

    assert.equal(
      history[0].redeemedAt,
      '2026-07-20T12:00:00.000Z'
    )
  }
)

test(
  'sorts redemption history newest first',
  () => {
    const history =
      getCustomerRedemptionHistory({
        offers: [
          createOffer({
            id: 'oldest',
          }),
          createOffer({
            id: 'newest',
          }),
          createOffer({
            id: 'middle',
          }),
        ],
        redemptionDateByOfferId:
          new Map([
            [
              'oldest',
              '2026-07-01T12:00:00.000Z',
            ],
            [
              'newest',
              '2026-07-20T12:00:00.000Z',
            ],
            [
              'middle',
              '2026-07-10T12:00:00.000Z',
            ],
          ]),
      })

    assert.deepEqual(
      history.map(
        (item) => item.offer.id
      ),
      [
        'newest',
        'middle',
        'oldest',
      ]
    )
  }
)

test(
  'uses business name and offer title for stable equal-date sorting',
  () => {
    const redeemedAt =
      '2026-07-20T12:00:00.000Z'

    const history =
      getCustomerRedemptionHistory({
        offers: [
          createOffer({
            id: 'zulu',
            business_name:
              'Zulu Business',
            title: 'First Offer',
          }),
          createOffer({
            id: 'alpha-second',
            business_name:
              'Alpha Business',
            title: 'Second Offer',
          }),
          createOffer({
            id: 'alpha-first',
            business_name:
              'Alpha Business',
            title: 'First Offer',
          }),
        ],
        redemptionDateByOfferId:
          new Map([
            ['zulu', redeemedAt],
            [
              'alpha-second',
              redeemedAt,
            ],
            [
              'alpha-first',
              redeemedAt,
            ],
          ]),
      })

    assert.deepEqual(
      history.map(
        (item) => item.offer.id
      ),
      [
        'alpha-first',
        'alpha-second',
        'zulu',
      ]
    )
  }
)

test(
  'returns an empty history when nothing has been redeemed',
  () => {
    const history =
      getCustomerRedemptionHistory({
        offers: [
          createOffer({
            id: 'offer-1',
          }),
        ],
        redemptionDateByOfferId:
          new Map(),
      })

    assert.deepEqual(
      history,
      []
    )
  }
)

// =============================================================================
// Display fallbacks
// =============================================================================

test(
  'uses trimmed primary business names',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      business_name:
        '  Community Coffee  ',
      google_business_name:
        'Google Coffee',
    })

    assert.equal(
      getCustomerRedemptionBusinessName(
        offer
      ),
      'Community Coffee'
    )
  }
)

test(
  'falls back to the Google business name',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      business_name: undefined,
      google_business_name:
        '  Google Business  ',
    })

    assert.equal(
      getCustomerRedemptionBusinessName(
        offer
      ),
      'Google Business'
    )
  }
)

test(
  'uses safe business, title, and benefit labels when values are missing',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      business_name: undefined,
      google_business_name: null,
      title: '   ',
      discount: '   ',
    })

    assert.equal(
      getCustomerRedemptionBusinessName(
        offer
      ),
      'Local Business'
    )

    assert.equal(
      getCustomerRedemptionOfferTitle(
        offer
      ),
      'Local offer'
    )

    assert.equal(
      getCustomerRedemptionBenefitLabel(
        offer
      ),
      'RaiseHub member benefit'
    )
  }
)

test(
  'trims offer titles and benefit labels',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      title:
        '  Free Appetizer  ',
      discount:
        '  One free item  ',
    })

    assert.equal(
      getCustomerRedemptionOfferTitle(
        offer
      ),
      'Free Appetizer'
    )

    assert.equal(
      getCustomerRedemptionBenefitLabel(
        offer
      ),
      'One free item'
    )
  }
)

// =============================================================================
// Map links
// =============================================================================

test(
  'preserves complete Google Maps URLs',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      google_maps_url:
        '  https://maps.google.com/example  ',
    })

    assert.equal(
      getCustomerRedemptionMapUrl(
        offer
      ),
      'https://maps.google.com/example'
    )
  }
)

test(
  'adds https to Google Maps URLs missing a protocol',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      google_maps_url:
        'maps.google.com/example',
    })

    assert.equal(
      getCustomerRedemptionMapUrl(
        offer
      ),
      'https://maps.google.com/example'
    )
  }
)

test(
  'creates a Google Maps search URL from the business address',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      google_maps_url: undefined,
      address:
        '  123 Main Street, Lubbock, TX  ',
    })

    assert.equal(
      getCustomerRedemptionMapUrl(
        offer
      ),
      'https://www.google.com/maps/search/?api=1&query=123%20Main%20Street%2C%20Lubbock%2C%20TX'
    )
  }
)

test(
  'returns no map URL when location information is unavailable',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      google_maps_url: '   ',
      address: '   ',
    })

    assert.equal(
      getCustomerRedemptionMapUrl(
        offer
      ),
      null
    )
  }
)