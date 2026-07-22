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
      './business-dashboard.tsx',
      import.meta.url
    ),
    'utf8'
  )

// =============================================================================
// Profile contract
// =============================================================================

test(
  'includes redemption method in the business profile contract',
  () => {
    assert.match(
      dashboardSource,
      /redemption_method: string \| null/
    )
  }
)

test(
  'keeps the legacy profile field list separate',
  () => {
    assert.match(
      dashboardSource,
      /const BUSINESS_PROFILE_FIELDS =/
    )

    assert.match(
      dashboardSource,
      /const BUSINESS_PROFILE_FIELDS_WITH_REDEMPTION =/
    )

    assert.match(
      dashboardSource,
      /`\$\{BUSINESS_PROFILE_FIELDS\}, redemption_method`/
    )
  }
)

// =============================================================================
// Primary query
// =============================================================================

test(
  'requests redemption method in the primary profile query',
  () => {
    assert.match(
      dashboardSource,
      /\.select\(\s*BUSINESS_PROFILE_FIELDS_WITH_REDEMPTION\s*\)/
    )
  }
)

test(
  'continues to scope the profile query to the selected business',
  () => {
    assert.match(
      dashboardSource,
      /\.eq\('id', businessProfileId\)\s*\.single\(\)/
    )
  }
)

// =============================================================================
// Missing-column detection
// =============================================================================

test(
  'detects supported missing-column error codes',
  () => {
    assert.match(
      dashboardSource,
      /error\.code === '42703'/
    )

    assert.match(
      dashboardSource,
      /error\.code === 'PGRST204'/
    )
  }
)

test(
  'detects missing-column errors by redemption method message',
  () => {
    assert.match(
      dashboardSource,
      /\.toLowerCase\(\)\s*\.includes\('redemption_method'\) === true/
    )
  }
)

test(
  'does not treat every profile query error as a missing column',
  () => {
    const helperStart =
      dashboardSource.indexOf(
        'function isMissingRedemptionMethodError'
      )

    const loaderStart =
      dashboardSource.indexOf(
        'export default async function BusinessDashboard'
      )

    assert.notEqual(
      helperStart,
      -1
    )

    assert.notEqual(
      loaderStart,
      -1
    )

    const helperSource =
      dashboardSource.slice(
        helperStart,
        loaderStart
      )

    assert.match(
      helperSource,
      /if \(!error\) return false/
    )

    assert.doesNotMatch(
      helperSource,
      /return true\s*;?\s*}/
    )
  }
)

// =============================================================================
// Legacy fallback
// =============================================================================

test(
  'retries with legacy fields only for a missing redemption method column',
  () => {
    assert.match(
      dashboardSource,
      /if \(\s*isMissingRedemptionMethodError\(\s*profileWithRedemptionMethod\.error\s*\)\s*\)/
    )

    assert.match(
      dashboardSource,
      /\.select\(BUSINESS_PROFILE_FIELDS\)/
    )
  }
)

test(
  'adds a null redemption method to the legacy profile result',
  () => {
    assert.match(
      dashboardSource,
      /profile = legacyProfile\s*\?\s*\{\s*\.\.\.legacyProfile,\s*redemption_method: null,?\s*}/
    )
  }
)

// =============================================================================
// Dashboard handoff
// =============================================================================

test(
  'passes the resolved profile into business dashboard content',
  () => {
    assert.match(
      dashboardSource,
      /<BusinessDashboardContent/
    )

    assert.match(
      dashboardSource,
      /profile=\{profile\}/
    )
  }
)

// =============================================================================
// Safety
// =============================================================================

test(
  'does not write redemption settings from the loader',
  () => {
    assert.doesNotMatch(
      dashboardSource,
      /\.update\(/
    )

    assert.doesNotMatch(
      dashboardSource,
      /\.insert\(/
    )

    assert.doesNotMatch(
      dashboardSource,
      /\.upsert\(/
    )
  }
)