import assert from 'node:assert/strict'
import {
  readFileSync,
} from 'node:fs'
import test from 'node:test'

import {
  getBusinessRedemptionSettings,
} from '@/lib/redemptions/business-redemption-settings'

// =============================================================================
// Source
// =============================================================================

const componentSource =
  readFileSync(
    new URL(
      './business-redemption-settings-section.tsx',
      import.meta.url
    ),
    'utf8'
  )

// =============================================================================
// Component contract
// =============================================================================

test(
  'exports the business redemption settings section',
  () => {
    assert.match(
      componentSource,
      /export function BusinessRedemptionSettingsSection/
    )

    assert.match(
      componentSource,
      /export default BusinessRedemptionSettingsSection/
    )
  }
)

test(
  'accepts an optional redemption method',
  () => {
    assert.match(
      componentSource,
      /redemptionMethod\?: unknown/
    )

    assert.match(
      componentSource,
      /getBusinessRedemptionSettings\(\s*redemptionMethod\s*\)/
    )
  }
)

test(
  'uses an accessible section heading',
  () => {
    assert.match(
      componentSource,
      /aria-labelledby="business-redemption-settings-heading"/
    )

    assert.match(
      componentSource,
      /id="business-redemption-settings-heading"/
    )

    assert.match(
      componentSource,
      /\{settings\.heading\}/
    )
  }
)

// =============================================================================
// Launch presentation
// =============================================================================

test(
  'presents staff confirmation as the launch default',
  () => {
    const settings =
      getBusinessRedemptionSettings(
        undefined
      )

    assert.equal(
      settings.selectedMethod,
      'staff_confirmation'
    )

    const selectedOption =
      settings.options.find(
        ({ isSelected }) =>
          isSelected
      )

    assert.equal(
      selectedOption?.value,
      'staff_confirmation'
    )

    assert.equal(
      selectedOption?.statusLabel,
      'Available'
    )
  }
)

test(
  'presents planned methods as coming later',
  () => {
    const settings =
      getBusinessRedemptionSettings(
        undefined
      )

    const plannedOptions =
      settings.options.filter(
        ({ isSelectable }) =>
          !isSelectable
      )

    assert.deepEqual(
      plannedOptions.map(
        ({ value }) =>
          value
      ),
      [
        'qr_code',
        'staff_code',
        'square',
      ]
    )

    assert.equal(
      plannedOptions.every(
        ({ statusLabel }) =>
          statusLabel ===
          'Coming Later'
      ),
      true
    )
  }
)

test(
  'shows the current method label',
  () => {
    assert.match(
      componentSource,
      /option\.isSelected/
    )

    assert.match(
      componentSource,
      />\s*Current\s*</
    )
  }
)

test(
  'shows availability status for every option',
  () => {
    assert.match(
      componentSource,
      /\{option\.statusLabel\}/
    )

    assert.match(
      componentSource,
      /isAvailable\s*\?\s*'✓'\s*:\s*'○'/
    )
  }
)

test(
  'explains that planned methods cannot be selected',
  () => {
    assert.match(
      componentSource,
      /!option\.isSelectable/
    )

    assert.match(
      componentSource,
      /This option cannot be selected yet\./
    )
  }
)

// =============================================================================
// Safety
// =============================================================================

test(
  'does not expose save controls before persistence exists',
  () => {
    assert.doesNotMatch(
      componentSource,
      /<button/i
    )

    assert.doesNotMatch(
      componentSource,
      /<form/i
    )

    assert.doesNotMatch(
      componentSource,
      /onSubmit=/
    )

    assert.doesNotMatch(
      componentSource,
      /supabase/i
    )
  }
)

test(
  'does not depend on lucide react',
  () => {
    assert.doesNotMatch(
      componentSource,
      /lucide-react/
    )
  }
)