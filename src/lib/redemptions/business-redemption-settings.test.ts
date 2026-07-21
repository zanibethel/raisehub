import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canBusinessSelectRedemptionMethod,
  getBusinessRedemptionSettings,
} from './business-redemption-settings'

// =============================================================================
// Settings copy
// =============================================================================

test(
  'provides business-facing redemption settings guidance',
  () => {
    const settings =
      getBusinessRedemptionSettings(
        undefined
      )

    assert.equal(
      settings.heading,
      'Redemption Method'
    )

    assert.equal(
      settings.description,
      'Choose how customers confirm an offer at your business.'
    )

    assert.match(
      settings.helperText,
      /staff confirmation is available now/i
    )

    assert.match(
      settings.helperText,
      /additional redemption methods/i
    )
  }
)

// =============================================================================
// Default selection
// =============================================================================

test(
  'selects staff confirmation by default',
  () => {
    const settings =
      getBusinessRedemptionSettings(
        undefined
      )

    assert.equal(
      settings.selectedMethod,
      'staff_confirmation'
    )

    const selectedOptions =
      settings.options.filter(
        ({ isSelected }) =>
          isSelected
      )

    assert.equal(
      selectedOptions.length,
      1
    )

    assert.equal(
      selectedOptions[0].value,
      'staff_confirmation'
    )
  }
)

test(
  'preserves an available selected method',
  () => {
    const settings =
      getBusinessRedemptionSettings(
        'staff_confirmation'
      )

    assert.equal(
      settings.selectedMethod,
      'staff_confirmation'
    )
  }
)

// =============================================================================
// Planned-method fallback
// =============================================================================

test(
  'falls back when a planned method is requested',
  () => {
    for (
      const method
      of [
        'qr_code',
        'staff_code',
        'square',
      ]
    ) {
      const settings =
        getBusinessRedemptionSettings(
          method
        )

      assert.equal(
        settings.selectedMethod,
        'staff_confirmation'
      )
    }
  }
)

test(
  'falls back when an invalid method is requested',
  () => {
    const settings =
      getBusinessRedemptionSettings(
        'invalid'
      )

    assert.equal(
      settings.selectedMethod,
      'staff_confirmation'
    )
  }
)

// =============================================================================
// Option presentation
// =============================================================================

test(
  'returns every business redemption option',
  () => {
    const settings =
      getBusinessRedemptionSettings(
        undefined
      )

    assert.deepEqual(
      settings.options.map(
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
  'marks only staff confirmation as selectable',
  () => {
    const settings =
      getBusinessRedemptionSettings(
        undefined
      )

    const selectableOptions =
      settings.options.filter(
        ({ isSelectable }) =>
          isSelectable
      )

    assert.deepEqual(
      selectableOptions.map(
        ({ value }) =>
          value
      ),
      [
        'staff_confirmation',
      ]
    )
  }
)

test(
  'uses the correct availability labels',
  () => {
    const settings =
      getBusinessRedemptionSettings(
        undefined
      )

    const staffConfirmation =
      settings.options.find(
        ({ value }) =>
          value ===
          'staff_confirmation'
      )

    assert.equal(
      staffConfirmation?.statusLabel,
      'Available'
    )

    for (
      const method
      of [
        'qr_code',
        'staff_code',
        'square',
      ]
    ) {
      const option =
        settings.options.find(
          ({ value }) =>
            value ===
            method
        )

      assert.equal(
        option?.statusLabel,
        'Coming Later'
      )
    }
  }
)

// =============================================================================
// Save validation
// =============================================================================

test(
  'allows the business to select staff confirmation',
  () => {
    assert.equal(
      canBusinessSelectRedemptionMethod(
        'staff_confirmation'
      ),
      true
    )
  }
)

test(
  'prevents the business from selecting planned methods',
  () => {
    assert.equal(
      canBusinessSelectRedemptionMethod(
        'qr_code'
      ),
      false
    )

    assert.equal(
      canBusinessSelectRedemptionMethod(
        'staff_code'
      ),
      false
    )

    assert.equal(
      canBusinessSelectRedemptionMethod(
        'square'
      ),
      false
    )
  }
)

test(
  'rejects missing and invalid save values',
  () => {
    assert.equal(
      canBusinessSelectRedemptionMethod(
        undefined
      ),
      false
    )

    assert.equal(
      canBusinessSelectRedemptionMethod(
        null
      ),
      false
    )

    assert.equal(
      canBusinessSelectRedemptionMethod(
        'invalid'
      ),
      false
    )
  }
)

// =============================================================================
// Returned object isolation
// =============================================================================

test(
  'returns fresh settings and option objects',
  () => {
    const firstSettings =
      getBusinessRedemptionSettings(
        undefined
      )

    const secondSettings =
      getBusinessRedemptionSettings(
        undefined
      )

    assert.notEqual(
      firstSettings,
      secondSettings
    )

    assert.notEqual(
      firstSettings.options,
      secondSettings.options
    )

    assert.notEqual(
      firstSettings.options[0],
      secondSettings.options[0]
    )

    assert.deepEqual(
      firstSettings,
      secondSettings
    )
  }
)