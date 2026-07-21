import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatCustomerNearbyBusinessRating,
  getCustomerNearbyBusinesses,
  getCustomerNearbyBusinessMapUrl,
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
// Rating labels
// =============================================================================

test(
  'returns no rating label when a rating is unavailable',
  () => {
    assert.equal(
      formatCustomerNearbyBusinessRating({
        rating: null,
        reviewCount: null,
      }),
      null
    )
  }
)

test(
  'formats a rating without review-count data',
  () => {
    assert.equal(
      formatCustomerNearbyBusinessRating({
        rating: 4.8,
        reviewCount: null,
      }),
      '4.8 rating'
    )
  }
)

test(
  'formats a rating with zero reviews',
  () => {
    assert.equal(
      formatCustomerNearbyBusinessRating({
        rating: 4.5,
        reviewCount: 0,
      }),
      '4.5 rating'
    )
  }
)

test(
  'uses singular review wording',
  () => {
    assert.equal(
      formatCustomerNearbyBusinessRating({
        rating: 5,
        reviewCount: 1,
      }),
      '5.0 rating · 1 review'
    )
  }
)

test(
  'uses plural review wording',
  () => {
    assert.equal(
      formatCustomerNearbyBusinessRating({
        rating: 4.7,
        reviewCount: 25,
      }),
      '4.7 rating · 25 reviews'
    )
  }
)

test(
  'formats large review counts for display',
  () => {
    const label =
      formatCustomerNearbyBusinessRating({
        rating: 4.9,
        reviewCount: 1250,
      })

    assert.ok(label)

    assert.match(
      label,
      /^4\.9 rating · 1[,\s]?250 reviews$/
    )
  }
)

// =============================================================================
// Map links
// =============================================================================

test(
  'preserves complete Google Maps URLs',
  () => {
    assert.equal(
      getCustomerNearbyBusinessMapUrl({
        googleMapsUrl:
          'https://maps.google.com/example',
        address: null,
      }),
      'https://maps.google.com/example'
    )
  }
)

test(
  'trims complete Google Maps URLs',
  () => {
    assert.equal(
      getCustomerNearbyBusinessMapUrl({
        googleMapsUrl:
          '  https://maps.google.com/example  ',
        address: null,
      }),
      'https://maps.google.com/example'
    )
  }
)

test(
  'adds https to map URLs missing a protocol',
  () => {
    assert.equal(
      getCustomerNearbyBusinessMapUrl({
        googleMapsUrl:
          'maps.google.com/example',
        address: null,
      }),
      'https://maps.google.com/example'
    )
  }
)

test(
  'prefers a direct map URL over an address',
  () => {
    assert.equal(
      getCustomerNearbyBusinessMapUrl({
        googleMapsUrl:
          'maps.google.com/direct',
        address:
          '123 Main Street',
      }),
      'https://maps.google.com/direct'
    )
  }
)

test(
  'creates a Google Maps search from an address',
  () => {
    assert.equal(
      getCustomerNearbyBusinessMapUrl({
        googleMapsUrl: null,
        address:
          '123 Main Street, Lubbock, TX',
      }),
      'https://www.google.com/maps/search/?api=1&query=123%20Main%20Street%2C%20Lubbock%2C%20TX'
    )
  }
)

test(
  'trims an address before creating a map search',
  () => {
    assert.equal(
      getCustomerNearbyBusinessMapUrl({
        googleMapsUrl: '   ',
        address:
          '  500 Oak Avenue  ',
      }),
      'https://www.google.com/maps/search/?api=1&query=500%20Oak%20Avenue'
    )
  }
)

test(
  'returns no map URL without map or address data',
  () => {
    assert.equal(
      getCustomerNearbyBusinessMapUrl({
        googleMapsUrl: '   ',
        address: '   ',
      }),
      null
    )
  }
)

// =============================================================================
// Website links
// =============================================================================

test(
  'preserves complete business website URLs',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'complete-website',
          google_place_id:
            'complete-website-place',
          google_website_url:
            '  https://example.com  ',
        }),
      ])

    assert.equal(
      businesses[0].websiteUrl,
      'https://example.com'
    )
  }
)

test(
  'adds https to business websites missing a protocol',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'missing-protocol',
          google_place_id:
            'missing-protocol-place',
          google_website_url:
            'example.com/deals',
        }),
      ])

    assert.equal(
      businesses[0].websiteUrl,
      'https://example.com/deals'
    )
  }
)

test(
  'returns no website URL when the value is blank',
  () => {
    const businesses =
      getCustomerNearbyBusinesses([
        createOffer({
          id: 'blank-website',
          google_place_id:
            'blank-website-place',
          google_website_url: '   ',
        }),
      ])

    assert.equal(
      businesses[0].websiteUrl,
      null
    )
  }
)