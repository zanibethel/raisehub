import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_REDEMPTION_METHOD,
  REDEMPTION_METHODS,
  getRedemptionMethod,
  getRedemptionMethodOption,
  getRedemptionMethodOptions,
  isRedemptionMethod,
  isRedemptionMethodAvailable,
} from './redemption-method'

// =============================================================================
// Supported redemption methods
// =============================================================================

test(
  'defines the supported redemption methods',
  () => {
    assert.deepEqual(
      REDEMPTION_METHODS,
      [
        'staff_confirmation',
        'qr_code',
        'staff_code',
        'square',
      ]
    )
  }
)

test(
  'uses staff confirmation as the launch default',
  () => {
    assert.equal(
      DEFAULT_REDEMPTION_METHOD,
      'staff_confirmation'
    )
  }
)

// =============================================================================
// Validation
// =============================================================================

test(
  'recognizes valid redemption methods',
  () => {
    for (
      const method
      of REDEMPTION_METHODS
    ) {
      assert.equal(
        isRedemptionMethod(
          method
        ),
        true
      )
    }
  }
)

test(
  'rejects invalid redemption methods',
  () => {
    assert.equal(
      isRedemptionMethod(
        'manual'
      ),
      false
    )

    assert.equal(
      isRedemptionMethod(
        ''
      ),
      false
    )

    assert.equal(
      isRedemptionMethod(
        null
      ),
      false
    )

    assert.equal(
      isRedemptionMethod(
        undefined
      ),
      false
    )
  }
)

// =============================================================================
// Safe resolution
// =============================================================================

test(
  'preserves valid redemption methods',
  () => {
    assert.equal(
      getRedemptionMethod(
        'qr_code'
      ),
      'qr_code'
    )

    assert.equal(
      getRedemptionMethod(
        'square'
      ),
      'square'
    )
  }
)

test(
  'falls back to staff confirmation for missing or invalid values',
  () => {
    assert.equal(
      getRedemptionMethod(
        undefined
      ),
      'staff_confirmation'
    )

    assert.equal(
      getRedemptionMethod(
        null
      ),
      'staff_confirmation'
    )

    assert.equal(
      getRedemptionMethod(
        'unsupported'
      ),
      'staff_confirmation'
    )
  }
)

// =============================================================================
// Presentation options
// =============================================================================

test(
  'returns every redemption-method option',
  () => {
    const options =
      getRedemptionMethodOptions()

    assert.deepEqual(
      options.map(
        ({ value }) =>
          value
      ),
      [
        'staff_confirmation',
        'qr_code',
        'staff_code',
        'square',
      ]
    )
  }
)

test(
  'marks only staff confirmation as currently available',
  () => {
    const options =
      getRedemptionMethodOptions()

    const availableMethods =
      options
        .filter(
          ({ availability }) =>
            availability ===
            'available'
        )
        .map(
          ({ value }) =>
            value
        )

    assert.deepEqual(
      availableMethods,
      [
        'staff_confirmation',
      ]
    )
  }
)

test(
  'returns the matching presentation option',
  () => {
    const option =
      getRedemptionMethodOption(
        'staff_code'
      )

    assert.equal(
      option.value,
      'staff_code'
    )

    assert.equal(
      option.label,
      'Staff Code'
    )

    assert.equal(
      option.availability,
      'planned'
    )
  }
)

test(
  'returns the default option for invalid values',
  () => {
    const option =
      getRedemptionMethodOption(
        'invalid'
      )

    assert.equal(
      option.value,
      'staff_confirmation'
    )

    assert.equal(
      option.label,
      'Staff Confirmation'
    )
  }
)

// =============================================================================
// Availability
// =============================================================================

test(
  'reports launch availability safely',
  () => {
    assert.equal(
      isRedemptionMethodAvailable(
        'staff_confirmation'
      ),
      true
    )

    assert.equal(
      isRedemptionMethodAvailable(
        'qr_code'
      ),
      false
    )

    assert.equal(
      isRedemptionMethodAvailable(
        'staff_code'
      ),
      false
    )

    assert.equal(
      isRedemptionMethodAvailable(
        'square'
      ),
      false
    )
  }
)

test(
  'treats invalid values as the available default method',
  () => {
    assert.equal(
      isRedemptionMethodAvailable(
        'invalid'
      ),
      true
    )
  }
)

// =============================================================================
// Returned object isolation
// =============================================================================

test(
  'returns fresh option objects',
  () => {
    const firstOptions =
      getRedemptionMethodOptions()

    const secondOptions =
      getRedemptionMethodOptions()

    assert.notEqual(
      firstOptions,
      secondOptions
    )

    assert.notEqual(
      firstOptions[0],
      secondOptions[0]
    )

    assert.deepEqual(
      firstOptions,
      secondOptions
    )
  }
)