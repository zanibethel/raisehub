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
  'declares the settings section as a client component',
  () => {
    assert.match(
      componentSource,
      /^'use client'/
    )
  }
)

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
  'shows the current method labels',
  () => {
    assert.match(
      componentSource,
      />\s*Current\s*</
    )

    assert.match(
      componentSource,
      /Current method/
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
      /option\.isSelectable\s*\?/
    )

    assert.match(
      componentSource,
      /This option cannot be selected yet\./
    )
  }
)

// =============================================================================
// Save interaction
// =============================================================================

test(
  'uses the protected redemption settings action',
  () => {
    assert.match(
      componentSource,
      /updateBusinessRedemptionMethodAction/
    )

    assert.match(
      componentSource,
      /await updateBusinessRedemptionMethodAction\(\s*method\s*\)/
    )
  }
)

test(
  'tracks the selected redemption method locally',
  () => {
    assert.match(
      componentSource,
      /useState<RedemptionMethod>/
    )

    assert.match(
      componentSource,
      /initialSettings\.selectedMethod/
    )

    assert.match(
      componentSource,
      /setSelectedMethod\(\s*result\.redemptionMethod\s*\)/
    )
  }
)

test(
  'uses a transition while saving',
  () => {
    assert.match(
      componentSource,
      /useTransition\(\)/
    )

    assert.match(
      componentSource,
      /startTransition\(async \(\) =>/
    )

    assert.match(
      componentSource,
      /isPending/
    )

    assert.match(
      componentSource,
      /Saving…/
    )
  }
)

test(
  'renders a button only for selectable methods',
  () => {
    assert.match(
      componentSource,
      /option\.isSelectable\s*\?\s*\(\s*<button/
    )

    assert.match(
      componentSource,
      /Use this method/
    )

    assert.match(
      componentSource,
      /onClick=\{\(\) =>\s*handleSelect\(\s*option\.value\s*\)/
    )
  }
)

test(
  'disables current, unavailable, and pending methods',
  () => {
    assert.match(
      componentSource,
      /const isDisabled =\s*!option\.isSelectable \|\|\s*option\.isSelected \|\|\s*isPending/
    )

    assert.match(
      componentSource,
      /disabled=\{isDisabled\}/
    )
  }
)

// =============================================================================
// Feedback
// =============================================================================

test(
  'clears previous feedback before saving',
  () => {
    assert.match(
      componentSource,
      /setSaveMessage\(null\)/
    )
  }
)

test(
  'shows the server action error message',
  () => {
    assert.match(
      componentSource,
      /if \(!result\.success\)/
    )

    assert.match(
      componentSource,
      /type: 'error'/
    )

    assert.match(
      componentSource,
      /text: result\.error/
    )
  }
)

test(
  'shows success feedback after saving',
  () => {
    assert.match(
      componentSource,
      /type: 'success'/
    )

    assert.match(
      componentSource,
      /Your redemption method has been updated\./
    )
  }
)

test(
  'uses accessible feedback roles',
  () => {
    assert.match(
      componentSource,
      /saveMessage\.type === 'error'\s*\?\s*'alert'\s*:\s*'status'/
    )

    assert.match(
      componentSource,
      /\{saveMessage\.text\}/
    )
  }
)

// =============================================================================
// Safety
// =============================================================================

test(
  'does not write directly to Supabase from the client section',
  () => {
    assert.doesNotMatch(
      componentSource,
      /createClient/
    )

    assert.doesNotMatch(
      componentSource,
      /\.from\('profiles'\)/
    )

    assert.doesNotMatch(
      componentSource,
      /\.update\(/
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