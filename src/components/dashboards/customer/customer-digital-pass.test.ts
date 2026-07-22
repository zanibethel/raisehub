import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// =============================================================================
// Sources
// =============================================================================

const digitalPassSource = readFileSync(
  new URL(
    './customer-digital-pass.tsx',
    import.meta.url
  ),
  'utf8'
)

const dashboardSource = readFileSync(
  new URL(
    './customer-dashboard.tsx',
    import.meta.url
  ),
  'utf8'
)

// =============================================================================
// Digital pass prop
// =============================================================================

test(
  'accepts an optional supported organization name',
  () => {
    assert.match(
      digitalPassSource,
      /supportedOrganizationName\?:\s*string \| null/
    )
  }
)

test(
  'passes the organization name into the active pass',
  () => {
    assert.match(
      digitalPassSource,
      /function ActivePass\(\{[\s\S]*?supportedOrganizationName,[\s\S]*?\}: \{[\s\S]*?supportedOrganizationName\?:\s*string \| null/
    )

    assert.match(
      digitalPassSource,
      /<ActivePass[\s\S]*?supportedOrganizationName=\{\s*supportedOrganizationName\s*\}/
    )
  }
)

// =============================================================================
// Organization card
// =============================================================================

test(
  'shows the supported organization only when a nonblank name exists',
  () => {
    assert.match(
      digitalPassSource,
      /supportedOrganizationName\?\.trim\(\)\s*\?\s*\(/
    )

    assert.match(
      digitalPassSource,
      />\s*Supporting\s*</
    )

    assert.match(
      digitalPassSource,
      /\{\s*supportedOrganizationName\s*\}/
    )

    assert.match(
      digitalPassSource,
      /\)\s*:\s*null/
    )
  }
)

test(
  'uses a responsive four-card active pass grid',
  () => {
    assert.match(
      digitalPassSource,
      /mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4/
    )
  }
)

// =============================================================================
// Active entitlement purchase connection
// =============================================================================

test(
  'uses the active entitlement purchase id to find the linked purchase',
  () => {
    assert.match(
      dashboardSource,
      /const activePassPurchase =\s*activeEntitlement\?\.purchase_id\s*\?\s*purchasedPasses\.find/
    )

    assert.match(
      dashboardSource,
      /purchase\.id ===\s*activeEntitlement\.purchase_id/
    )
  }
)

test(
  'resolves the organization from the linked purchase',
  () => {
    assert.match(
      dashboardSource,
      /activePassPurchase\s*\?\.selected_organization_id/
    )

    assert.match(
      dashboardSource,
      /organizationById\.get\(\s*activePassPurchase\s*\.selected_organization_id\s*\)/
    )
  }
)

test(
  'prefers organization display name over business name',
  () => {
    assert.match(
      dashboardSource,
      /const supportedOrganizationName =\s*activePassOrganization\?\.display_name \|\|\s*activePassOrganization\?\.business_name \|\|\s*null/
    )
  }
)

test(
  'passes the resolved organization name into the digital pass',
  () => {
    assert.match(
      dashboardSource,
      /<CustomerDigitalPass[\s\S]*?supportedOrganizationName=\{\s*supportedOrganizationName\s*\}/
    )
  }
)

// =============================================================================
// Existing behavior
// =============================================================================

test(
  'keeps the inactive pass path independent of organization data',
  () => {
    assert.match(
      digitalPassSource,
      /if \(!hasActivePass\) \{\s*return <InactivePass \/>\s*\}/
    )
  }
)