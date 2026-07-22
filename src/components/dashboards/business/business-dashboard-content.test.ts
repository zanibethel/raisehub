import assert from 'node:assert/strict'
import {
  readFileSync,
} from 'node:fs'
import test from 'node:test'

// =============================================================================
// Source
// =============================================================================

const dashboardSource =
  readFileSync(
    new URL(
      './business-dashboard-content.tsx',
      import.meta.url
    ),
    'utf8'
  )

// =============================================================================
// Redemption settings import
// =============================================================================

test(
  'imports the business redemption settings section',
  () => {
    assert.match(
      dashboardSource,
      /import BusinessRedemptionSettingsSection from '\.\/sections\/business-redemption-settings-section'/
    )
  }
)

// =============================================================================
// Profile contract
// =============================================================================

test(
  'supports an optional business profile redemption method',
  () => {
    assert.match(
      dashboardSource,
      /redemption_method\?: string \| null/
    )
  }
)

// =============================================================================
// Dashboard presentation
// =============================================================================

test(
  'renders the redemption settings section on the business dashboard',
  () => {
    assert.match(
      dashboardSource,
      /id="business-redemption-settings"/
    )

    assert.match(
      dashboardSource,
      /<BusinessRedemptionSettingsSection/
    )
  }
)

test(
  'passes the profile redemption method into the settings section',
  () => {
    assert.match(
      dashboardSource,
      /redemptionMethod=\{\s*profile\?\.redemption_method\s*\}/
    )
  }
)

test(
  'places redemption settings before business performance',
  () => {
    const redemptionSettingsIndex =
      dashboardSource.indexOf(
        'id="business-redemption-settings"'
      )

    const performanceIndex =
      dashboardSource.indexOf(
        'id="business-performance"'
      )

    assert.notEqual(
      redemptionSettingsIndex,
      -1
    )

    assert.notEqual(
      performanceIndex,
      -1
    )

    assert.equal(
      redemptionSettingsIndex <
        performanceIndex,
      true
    )
  }
)

// =============================================================================
// Safety
// =============================================================================

test(
  'does not add redemption save behavior to the dashboard',
  () => {
    const redemptionSectionStart =
      dashboardSource.indexOf(
        'id="business-redemption-settings"'
      )

    const performanceSectionStart =
      dashboardSource.indexOf(
        'id="business-performance"'
      )

    assert.notEqual(
      redemptionSectionStart,
      -1
    )

    assert.notEqual(
      performanceSectionStart,
      -1
    )

    const redemptionSectionSource =
      dashboardSource.slice(
        redemptionSectionStart,
        performanceSectionStart
      )

    assert.doesNotMatch(
      redemptionSectionSource,
      /<button/i
    )

    assert.doesNotMatch(
      redemptionSectionSource,
      /<form/i
    )

    assert.doesNotMatch(
      redemptionSectionSource,
      /onSubmit=/
    )

    assert.doesNotMatch(
      redemptionSectionSource,
      /supabase/i
    )
  }
)

test(
  'keeps the redemption settings section isolated from upgrade state',
  () => {
    const redemptionSectionStart =
      dashboardSource.indexOf(
        'id="business-redemption-settings"'
      )

    const performanceSectionStart =
      dashboardSource.indexOf(
        'id="business-performance"'
      )

    const redemptionSectionSource =
      dashboardSource.slice(
        redemptionSectionStart,
        performanceSectionStart
      )

    assert.doesNotMatch(
      redemptionSectionSource,
      /setIsUpgradeOpen/
    )

    assert.doesNotMatch(
      redemptionSectionSource,
      /isUpgradeOpen/
    )
  }
)