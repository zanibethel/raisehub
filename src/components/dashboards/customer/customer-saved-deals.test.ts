import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatCustomerSavedDealEndDate,
  formatCustomerSavedDealRedemptionDate,
  getCustomerSavedDealAddress,
  getCustomerSavedDealBenefitLabel,
  getCustomerSavedDealBusinessName,
  getCustomerSavedDealDescription,
  getCustomerSavedDealMapUrl,
  getCustomerSavedDealPhone,
  getCustomerSavedDeals,
  getCustomerSavedDealTitle,
} from './customer-saved-deals'

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
    starts_at: null,
    ends_at: null,
    business_name: `Business ${id}`,
    google_business_name: null,
    google_maps_url: undefined,
    address: null,
    phone: null,
    ...overrides,
  } as CustomerDashboardOffer
}

// =============================================================================
// Saved-deal filtering and state
// =============================================================================

test(
  'returns only offers saved by the customer',
  () => {
    const savedDeals =
      getCustomerSavedDeals({
        offers: [
          createOffer({
            id: 'saved-offer',
          }),
          createOffer({
            id: 'not-saved-offer',
          }),
        ],
        savedOfferIds:
          new Set(['saved-offer']),
        redeemedOfferIds:
          new Set(),
      })

    assert.equal(
      savedDeals.length,
      1
    )

    assert.equal(
      savedDeals[0].offer.id,
      'saved-offer'
    )
  }
)

test(
  'marks redeemed saved deals as used',
  () => {
    const savedDeals =
      getCustomerSavedDeals({
        offers: [
          createOffer({
            id: 'unused-offer',
          }),
          createOffer({
            id: 'redeemed-offer',
          }),
        ],
        savedOfferIds:
          new Set([
            'unused-offer',
            'redeemed-offer',
          ]),
        redeemedOfferIds:
          new Set([
            'redeemed-offer',
          ]),
      })

    const redeemedDeal =
      savedDeals.find(
        ({ offer }) =>
          offer.id ===
          'redeemed-offer'
      )

    const unusedDeal =
      savedDeals.find(
        ({ offer }) =>
          offer.id ===
          'unused-offer'
      )

    assert.equal(
      redeemedDeal?.isRedeemed,
      true
    )

    assert.equal(
      unusedDeal?.isRedeemed,
      false
    )
  }
)

// =============================================================================
// Saved-deal ordering
// =============================================================================

test(
  'places unused saved deals before redeemed deals',
  () => {
    const savedDeals =
      getCustomerSavedDeals({
        offers: [
          createOffer({
            id: 'redeemed-offer',
            ends_at:
              '2026-07-01T12:00:00.000Z',
          }),
          createOffer({
            id: 'unused-offer',
            ends_at:
              '2026-12-01T12:00:00.000Z',
          }),
        ],
        savedOfferIds:
          new Set([
            'redeemed-offer',
            'unused-offer',
          ]),
        redeemedOfferIds:
          new Set([
            'redeemed-offer',
          ]),
      })

    assert.deepEqual(
      savedDeals.map(
        ({ offer }) => offer.id
      ),
      [
        'unused-offer',
        'redeemed-offer',
      ]
    )
  }
)

test(
  'sorts saved deals with valid end dates by earliest expiration',
  () => {
    const savedDeals =
      getCustomerSavedDeals({
        offers: [
          createOffer({
            id: 'latest',
            ends_at:
              '2026-09-01T12:00:00.000Z',
          }),
          createOffer({
            id: 'earliest',
            ends_at:
              '2026-07-25T12:00:00.000Z',
          }),
          createOffer({
            id: 'middle',
            ends_at:
              '2026-08-01T12:00:00.000Z',
          }),
        ],
        savedOfferIds:
          new Set([
            'latest',
            'earliest',
            'middle',
          ]),
        redeemedOfferIds:
          new Set(),
      })

    assert.deepEqual(
      savedDeals.map(
        ({ offer }) => offer.id
      ),
      [
        'earliest',
        'middle',
        'latest',
      ]
    )
  }
)

test(
  'places missing or invalid end dates after valid end dates',
  () => {
    const savedDeals =
      getCustomerSavedDeals({
        offers: [
          createOffer({
            id: 'missing-date',
            ends_at: null,
          }),
          createOffer({
            id: 'invalid-date',
            ends_at: 'invalid-date',
          }),
          createOffer({
            id: 'valid-date',
            ends_at:
              '2026-08-01T12:00:00.000Z',
          }),
        ],
        savedOfferIds:
          new Set([
            'missing-date',
            'invalid-date',
            'valid-date',
          ]),
        redeemedOfferIds:
          new Set(),
      })

    assert.equal(
      savedDeals[0].offer.id,
      'valid-date'
    )
  }
)

test(
  'uses business and title for stable fallback sorting',
  () => {
    const savedDeals =
      getCustomerSavedDeals({
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
        savedOfferIds:
          new Set([
            'zulu',
            'alpha-second',
            'alpha-first',
          ]),
        redeemedOfferIds:
          new Set(),
      })

    assert.deepEqual(
      savedDeals.map(
        ({ offer }) => offer.id
      ),
      [
        'alpha-first',
        'alpha-second',
        'zulu',
      ]
    )
  }
)

// =============================================================================
// Date formatting
// =============================================================================

test(
  'formats saved-deal end dates',
  () => {
    assert.equal(
      formatCustomerSavedDealEndDate(
        '2026-07-25T12:00:00.000Z',
        'en-US'
      ),
      'Jul 25, 2026'
    )
  }
)

test(
  'returns safe end-date fallbacks',
  () => {
    assert.equal(
      formatCustomerSavedDealEndDate(
        null,
        'en-US'
      ),
      'No listed end date'
    )

    assert.equal(
      formatCustomerSavedDealEndDate(
        'invalid-date',
        'en-US'
      ),
      'Date unavailable'
    )
  }
)

test(
  'returns safe redemption-date fallbacks',
  () => {
    assert.equal(
      formatCustomerSavedDealRedemptionDate(
        undefined,
        'en-US'
      ),
      'Date unavailable'
    )

    assert.equal(
      formatCustomerSavedDealRedemptionDate(
        'invalid-date',
        'en-US'
      ),
      'Date unavailable'
    )
  }
)

// =============================================================================
// Display fallbacks
// =============================================================================

test(
  'trims saved-deal presentation values',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      title:
        '  Free Appetizer  ',
      business_name:
        '  Local Restaurant  ',
      discount:
        '  One free item  ',
      description:
        '  Valid with purchase.  ',
      phone:
        '  806-555-0100  ',
      address:
        '  123 Main Street  ',
    })

    assert.equal(
      getCustomerSavedDealTitle(
        offer
      ),
      'Free Appetizer'
    )

    assert.equal(
      getCustomerSavedDealBusinessName(
        offer
      ),
      'Local Restaurant'
    )

    assert.equal(
      getCustomerSavedDealBenefitLabel(
        offer
      ),
      'One free item'
    )

    assert.equal(
      getCustomerSavedDealDescription(
        offer
      ),
      'Valid with purchase.'
    )

    assert.equal(
      getCustomerSavedDealPhone(
        offer
      ),
      '806-555-0100'
    )

    assert.equal(
      getCustomerSavedDealAddress(
        offer
      ),
      '123 Main Street'
    )
  }
)

test(
  'uses safe display fallbacks when values are missing',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      title: '   ',
      business_name: undefined,
      google_business_name: null,
      discount: '   ',
      description: '   ',
      phone: '   ',
      address: '   ',
    })

    assert.equal(
      getCustomerSavedDealTitle(
        offer
      ),
      'Local offer'
    )

    assert.equal(
      getCustomerSavedDealBusinessName(
        offer
      ),
      'Local Business'
    )

    assert.equal(
      getCustomerSavedDealBenefitLabel(
        offer
      ),
      'Member benefit available'
    )

    assert.equal(
      getCustomerSavedDealDescription(
        offer
      ),
      'Offer details are available through your RaiseHub Pass.'
    )

    assert.equal(
      getCustomerSavedDealPhone(
        offer
      ),
      null
    )

    assert.equal(
      getCustomerSavedDealAddress(
        offer
      ),
      null
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
      getCustomerSavedDealBusinessName(
        offer
      ),
      'Google Business'
    )
  }
)

// =============================================================================
// Map links
// =============================================================================

test(
  'preserves complete map URLs',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      google_maps_url:
        '  https://maps.google.com/example  ',
    })

    assert.equal(
      getCustomerSavedDealMapUrl(
        offer
      ),
      'https://maps.google.com/example'
    )
  }
)

test(
  'adds https to map URLs missing a protocol',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      google_maps_url:
        'maps.google.com/example',
    })

    assert.equal(
      getCustomerSavedDealMapUrl(
        offer
      ),
      'https://maps.google.com/example'
    )
  }
)

test(
  'creates a map search URL from an address',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      google_maps_url: undefined,
      address:
        '  123 Main Street, Lubbock, TX  ',
    })

    assert.equal(
      getCustomerSavedDealMapUrl(
        offer
      ),
      'https://www.google.com/maps/search/?api=1&query=123%20Main%20Street%2C%20Lubbock%2C%20TX'
    )
  }
)

test(
  'returns no map URL without map or address data',
  () => {
    const offer = createOffer({
      id: 'offer-1',
      google_maps_url: '   ',
      address: '   ',
    })

    assert.equal(
      getCustomerSavedDealMapUrl(
        offer
      ),
      null
    )
  }
)