import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getCustomerDealFilterMatchLabel,
  getCustomerDealShortcutAriaLabel,
  getCustomerDealShortcutCardClasses,
  getCustomerDealShortcutCountClasses,
  getCustomerDealShortcutCountLabel,
  getCustomerDealShortcutHeadingClasses,
  getCustomerDealShortcutStatus,
  getCustomerDealShortcutStatusClasses,
} from './customer-deal-shortcuts'

import type {
  CustomerDealFilter,
} from './customer-deal-filters'

// =============================================================================
// Test helpers
// =============================================================================

const FILTERS: CustomerDealFilter[] = [
  'nearby',
  'saved',
  'expiring',
  'all',
]

// =============================================================================
// Count labels
// =============================================================================

test(
  'uses singular deal wording',
  () => {
    assert.equal(
      getCustomerDealShortcutCountLabel(
        1
      ),
      '1 deal'
    )
  }
)

test(
  'uses plural deal wording',
  () => {
    assert.equal(
      getCustomerDealShortcutCountLabel(
        0
      ),
      '0 deals'
    )

    assert.equal(
      getCustomerDealShortcutCountLabel(
        12
      ),
      '12 deals'
    )
  }
)

test(
  'builds accessible shortcut labels',
  () => {
    assert.equal(
      getCustomerDealShortcutAriaLabel({
        label: 'Saved Deals',
        count: 1,
      }),
      'Saved Deals: 1 deal'
    )

    assert.equal(
      getCustomerDealShortcutAriaLabel({
        label: 'Nearby',
        count: 4,
      }),
      'Nearby: 4 deals'
    )
  }
)

// =============================================================================
// Filter match labels
// =============================================================================

test(
  'uses singular matching-deal wording',
  () => {
    assert.equal(
      getCustomerDealFilterMatchLabel(
        1
      ),
      '1 matching deal'
    )
  }
)

test(
  'uses plural matching-deal wording',
  () => {
    assert.equal(
      getCustomerDealFilterMatchLabel(
        0
      ),
      '0 matching deals'
    )

    assert.equal(
      getCustomerDealFilterMatchLabel(
        8
      ),
      '8 matching deals'
    )
  }
)

// =============================================================================
// Status labels
// =============================================================================

test(
  'prioritizes the active shortcut status',
  () => {
    assert.equal(
      getCustomerDealShortcutStatus({
        isActive: true,
        isDisabled: true,
      }),
      'Showing now'
    )
  }
)

test(
  'describes disabled shortcuts',
  () => {
    assert.equal(
      getCustomerDealShortcutStatus({
        isActive: false,
        isDisabled: true,
      }),
      'No matches right now'
    )
  }
)

test(
  'describes available shortcuts',
  () => {
    assert.equal(
      getCustomerDealShortcutStatus({
        isActive: false,
        isDisabled: false,
      }),
      'Tap to view'
    )
  }
)

// =============================================================================
// Status classes
// =============================================================================

test(
  'uses the active status color',
  () => {
    assert.equal(
      getCustomerDealShortcutStatusClasses({
        isActive: true,
        isDisabled: false,
      }),
      'text-gray-700'
    )
  }
)

test(
  'uses the disabled status color',
  () => {
    assert.equal(
      getCustomerDealShortcutStatusClasses({
        isActive: false,
        isDisabled: true,
      }),
      'text-gray-500'
    )
  }
)

test(
  'uses the available status color',
  () => {
    assert.equal(
      getCustomerDealShortcutStatusClasses({
        isActive: false,
        isDisabled: false,
      }),
      'text-gray-600'
    )
  }
)

// =============================================================================
// Filter-specific count classes
// =============================================================================

test(
  'uses filter-specific count colors',
  () => {
    assert.equal(
      getCustomerDealShortcutCountClasses(
        'nearby'
      ),
      'text-green-700'
    )

    assert.equal(
      getCustomerDealShortcutCountClasses(
        'saved'
      ),
      'text-yellow-700'
    )

    assert.equal(
      getCustomerDealShortcutCountClasses(
        'expiring'
      ),
      'text-orange-700'
    )

    assert.equal(
      getCustomerDealShortcutCountClasses(
        'all'
      ),
      'text-blue-700'
    )
  }
)

// =============================================================================
// Heading classes
// =============================================================================

test(
  'removes heading hover styling from disabled shortcuts',
  () => {
    for (const filter of FILTERS) {
      assert.equal(
        getCustomerDealShortcutHeadingClasses({
          filter,
          isDisabled: true,
        }),
        ''
      )
    }
  }
)

test(
  'uses filter-specific heading hover colors',
  () => {
    assert.equal(
      getCustomerDealShortcutHeadingClasses({
        filter: 'nearby',
        isDisabled: false,
      }),
      'group-hover:text-green-700'
    )

    assert.equal(
      getCustomerDealShortcutHeadingClasses({
        filter: 'saved',
        isDisabled: false,
      }),
      'group-hover:text-yellow-700'
    )

    assert.equal(
      getCustomerDealShortcutHeadingClasses({
        filter: 'expiring',
        isDisabled: false,
      }),
      'group-hover:text-orange-700'
    )

    assert.equal(
      getCustomerDealShortcutHeadingClasses({
        filter: 'all',
        isDisabled: false,
      }),
      'group-hover:text-blue-700'
    )
  }
)

// =============================================================================
// Card classes
// =============================================================================

test(
  'uses filter-specific card colors',
  () => {
    assert.match(
      getCustomerDealShortcutCardClasses({
        filter: 'nearby',
        isActive: false,
        isDisabled: false,
      }),
      /border-green-100/
    )

    assert.match(
      getCustomerDealShortcutCardClasses({
        filter: 'saved',
        isActive: false,
        isDisabled: false,
      }),
      /border-yellow-100/
    )

    assert.match(
      getCustomerDealShortcutCardClasses({
        filter: 'expiring',
        isActive: false,
        isDisabled: false,
      }),
      /border-orange-100/
    )

    assert.match(
      getCustomerDealShortcutCardClasses({
        filter: 'all',
        isActive: false,
        isDisabled: false,
      }),
      /border-blue-100/
    )
  }
)

test(
  'adds active interaction and ring classes',
  () => {
    const classes =
      getCustomerDealShortcutCardClasses({
        filter: 'saved',
        isActive: true,
        isDisabled: false,
      })

    assert.match(
      classes,
      /ring-2/
    )

    assert.match(
      classes,
      /ring-yellow-500/
    )

    assert.match(
      classes,
      /shadow-md/
    )

    assert.match(
      classes,
      /-translate-y-0\.5/
    )
  }
)

test(
  'adds disabled interaction classes',
  () => {
    const classes =
      getCustomerDealShortcutCardClasses({
        filter: 'nearby',
        isActive: false,
        isDisabled: true,
      })

    assert.match(
      classes,
      /cursor-not-allowed/
    )

    assert.match(
      classes,
      /opacity-60/
    )

    assert.doesNotMatch(
      classes,
      /hover:border-green-200/
    )
  }
)

test(
  'adds hover interaction classes to available shortcuts',
  () => {
    const classes =
      getCustomerDealShortcutCardClasses({
        filter: 'all',
        isActive: false,
        isDisabled: false,
      })

    assert.match(
      classes,
      /hover:border-blue-200/
    )

    assert.match(
      classes,
      /hover:-translate-y-0\.5/
    )

    assert.match(
      classes,
      /hover:shadow-md/
    )
  }
)