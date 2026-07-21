import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getCustomerNearbyBusinesses,
  hasNearbyBusinessLocation,
} from './customer-nearby-businesses'

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
    business_name: `Business ${id}`,
    google_business_name: null,
    google_place_id: null,
    google_maps_url: null,
    google_website_url: null,
    google_primary_category: null,
    google_rating: null,
    google_review_count: null,
    business_latitude: null,
    business_longitude: null,
    address: null,
    phone: null,
    ...overrides,
  } as CustomerDashboardOffer
}

// =============================================================================
// Location validation
// =============================================================================

test(
  'accepts offers with a usable street address',
  () => {
    const offer = createOffer({
      id: 'address-offer',
      address:
        '123 Main Street, Lubbock, TX',
    })

    assert.equal(
      hasNearbyBusinessLocation(offer),
      true
    )
  }
)

test(
  'accepts offers with verified coordinates',
  () => {
    const offer = createOffer({
      id: 'coordinate-offer',
      business_latitude: 33.5779,
      business_longitude: -101.8552,
    })

    assert.equal(
      hasNearbyBusinessLocation(offer),
      true
    )
  }
)

test(
  'accepts offers with Google location details',
  () => {
    const mapOffer = createOffer({
      id: 'map-offer',
      google_maps_url:
        'https://maps.google.com/example',
    })

    const placeOffer = createOffer({
      id: 'place-offer',
      google_place_id:
        'google-place-123',
    })

    assert.equal(
      hasNearbyBusinessLocation(
        mapOffer
      ),
      true
    )

    assert.equal(
      hasNearbyBusinessLocation(
        placeOffer
      ),
      true
    )
  }
)

test(
  'rejects offers without usable location information',
  () => {
    const offer = createOffer({
      id: 'missing-location',
      address: '   ',
      google_maps_url: '   ',
      google_place_id: '   ',
      business_latitude: null,
      business_longitude: null,
    })

    assert.equal(
      hasNearbyBusinessLocation(offer),
      false
    )
  }
)

test(
  'requires both latitude and longitude for coordinate-only locations',
  () => {
    const latitudeOnly =
      createOffer({
        id: 'latitude-only',
        business_latitude:
          33.5779,
      })

    const longitudeOnly =
      createOffer({
        id: 'longitude-only',
        business_longitude:
          -101.8552,
      })

    assert.equal(
      hasNearbyBusinessLocation(
        latitudeOnly
      ),
      false
    )

    assert.equal(
      hasNearbyBusinessLocation(
        longitudeOnly
      ),
      false
    )
  }
)

// =============================================================================
// Business grouping
// =============================================================================

test(
  'groups offers sharing the same Google Place ID',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'offer-1',
          business_name:
            'Community Coffee',
          google_place_id:
            'shared-place-id',
          address:
            '100 Main Street',
        }),
        createOffer({
          id: 'offer-2',
          business_name:
            'Community Coffee',
          google_place_id:
            'shared-place-id',
          address:
            '100 Main Street',
        }),
      ])

    assert.equal(
      businesses.length,
      1
    )

    assert.equal(
      businesses[0].offerCount,
      2
    )

    assert.deepEqual(
      businesses[0].offerIds,
      ['offer-1', 'offer-2']
    )
  }
)

test(
  'groups offers sharing the same coordinates',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'offer-1',
          business_name:
            'Local Pizza',
          business_latitude:
            33.5,
          business_longitude:
            -101.8,
        }),
        createOffer({
          id: 'offer-2',
          business_name:
            'Local Pizza',
          business_latitude:
            33.5,
          business_longitude:
            -101.8,
        }),
      ])

    assert.equal(
      businesses.length,
      1
    )

    assert.equal(
      businesses[0].offerCount,
      2
    )
  }
)

test(
  'groups matching addresses without case sensitivity',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'offer-1',
          business_name:
            'Neighborhood Market',
          address:
            '200 Oak Avenue',
        }),
        createOffer({
          id: 'offer-2',
          business_name:
            'Neighborhood Market',
          address:
            '200 OAK AVENUE',
        }),
      ])

    assert.equal(
      businesses.length,
      1
    )

    assert.equal(
      businesses[0].offerCount,
      2
    )
  }
)

test(
  'does not duplicate the same offer ID within a business',
  () => {
    const repeatedOffer =
      createOffer({
        id: 'same-offer',
        business_name:
          'Repeat Business',
        google_place_id:
          'repeat-place',
      })

    const businesses =
      getCustomerNearbyBusinesses([
        repeatedOffer,
        repeatedOffer,
      ])

    assert.equal(
      businesses.length,
      1
    )

    assert.equal(
      businesses[0].offerCount,
      1
    )

    assert.deepEqual(
      businesses[0].offerIds,
      ['same-offer']
    )
  }
)

test(
  'keeps distinct businesses separate',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'offer-1',
          business_name:
            'Business One',
          google_place_id:
            'place-one',
        }),
        createOffer({
          id: 'offer-2',
          business_name:
            'Business Two',
          google_place_id:
            'place-two',
        }),
      ])

    assert.equal(
      businesses.length,
      2
    )
  }
)

// =============================================================================
// Business details
// =============================================================================

test(
  'preserves normalized business details',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'offer-1',
          business_name:
            '  Community Salon  ',
          google_place_id:
            'salon-place',
          google_primary_category:
            '  Hair Salon  ',
          address:
            '  300 Elm Street  ',
          phone:
            '  806-555-0100  ',
          google_maps_url:
            '  https://maps.google.com/salon  ',
          google_website_url:
            '  https://example.com  ',
          google_rating: 4.8,
          google_review_count:
            124.9,
          business_latitude:
            33.57,
          business_longitude:
            -101.85,
        }),
      ])

    assert.deepEqual(
      businesses[0],
      {
        id: 'place:salon-place',
        name: 'Community Salon',
        category: 'Hair Salon',
        address: '300 Elm Street',
        phone: '806-555-0100',
        googleMapsUrl:
          'https://maps.google.com/salon',
        websiteUrl:
          'https://example.com',
        rating: 4.8,
        reviewCount: 124,
        latitude: 33.57,
        longitude: -101.85,
        offerCount: 1,
        offerIds: ['offer-1'],
      }
    )
  }
)

test(
  'uses the Google business name when the primary business name is missing',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'offer-1',
          business_name: null,
          google_business_name:
            'Google Business Name',
          google_place_id:
            'google-name-place',
        }),
      ])

    assert.equal(
      businesses[0].name,
      'Google Business Name'
    )
  }
)

test(
  'rejects invalid ratings and review counts',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'offer-1',
          google_place_id:
            'invalid-rating-place',
          google_rating: 7,
          google_review_count: -5,
        }),
      ])

    assert.equal(
      businesses[0].rating,
      null
    )

    assert.equal(
      businesses[0].reviewCount,
      null
    )
  }
)

// =============================================================================
// Sorting
// =============================================================================

test(
  'sorts businesses by rating first',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'lower-rated',
          business_name:
            'Lower Rated',
          google_place_id:
            'lower-rated-place',
          google_rating: 4.2,
          google_review_count:
            500,
        }),
        createOffer({
          id: 'higher-rated',
          business_name:
            'Higher Rated',
          google_place_id:
            'higher-rated-place',
          google_rating: 4.9,
          google_review_count: 5,
        }),
      ])

    assert.equal(
      businesses[0].name,
      'Higher Rated'
    )
  }
)

test(
  'uses review count when ratings are equal',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'few-reviews',
          business_name:
            'Few Reviews',
          google_place_id:
            'few-review-place',
          google_rating: 4.5,
          google_review_count: 10,
        }),
        createOffer({
          id: 'many-reviews',
          business_name:
            'Many Reviews',
          google_place_id:
            'many-review-place',
          google_rating: 4.5,
          google_review_count:
            200,
        }),
      ])

    assert.equal(
      businesses[0].name,
      'Many Reviews'
    )
  }
)

test(
  'uses offer count when ratings and reviews are equal',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'single-offer',
          business_name:
            'Single Offer',
          google_place_id:
            'single-place',
          google_rating: 4.5,
          google_review_count: 50,
        }),
        createOffer({
          id: 'multi-offer-1',
          business_name:
            'Multiple Offers',
          google_place_id:
            'multiple-place',
          google_rating: 4.5,
          google_review_count: 50,
        }),
        createOffer({
          id: 'multi-offer-2',
          business_name:
            'Multiple Offers',
          google_place_id:
            'multiple-place',
          google_rating: 4.5,
          google_review_count: 50,
        }),
      ])

    assert.equal(
      businesses[0].name,
      'Multiple Offers'
    )

    assert.equal(
      businesses[0].offerCount,
      2
    )
  }
)

test(
  'uses business name as the final stable sorting fallback',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'z-business',
          business_name:
            'Zulu Business',
          google_place_id:
            'zulu-place',
          google_rating: 4,
          google_review_count: 10,
        }),
        createOffer({
          id: 'a-business',
          business_name:
            'Alpha Business',
          google_place_id:
            'alpha-place',
          google_rating: 4,
          google_review_count: 10,
        }),
      ])

    assert.deepEqual(
      businesses.map(
        (business) =>
          business.name
      ),
      [
        'Alpha Business',
        'Zulu Business',
      ]
    )
  }
)

test(
  'returns an empty list when no offers contain location data',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'offer-1',
        }),
        createOffer({
          id: 'offer-2',
        }),
      ])

    assert.deepEqual(
      businesses,
      []
    )
  }
)