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
// Digital pass props
// =============================================================================

test(
  'accepts optional organization and campaign names',
  () => {
    assert.match(
      digitalPassSource,
      /supportedOrganizationName\?:\s*string \| null/
    )

    assert.match(
      digitalPassSource,
      /supportedCampaignName\?:\s*string \| null/
    )
  }
)

test(
  'passes support details into the active pass',
  () => {
    assert.match(
      digitalPassSource,
      /function ActivePass\(\{[\s\S]*?supportedOrganizationName,[\s\S]*?supportedCampaignName,[\s\S]*?\}: \{/
    )

    assert.match(
      digitalPassSource,
      /<ActivePass[\s\S]*?supportedOrganizationName=\{\s*supportedOrganizationName\s*\}[\s\S]*?supportedCampaignName=\{\s*supportedCampaignName\s*\}/
    )
  }
)

// =============================================================================
// Support details card
// =============================================================================

test(
  'normalizes blank organization and campaign names',
  () => {
    assert.match(
      digitalPassSource,
      /const hasSupportedOrganization =\s*Boolean\(\s*supportedOrganizationName\?\.trim\(\)\s*\)/
    )

    assert.match(
      digitalPassSource,
      /const hasSupportedCampaign =\s*Boolean\(\s*supportedCampaignName\?\.trim\(\)\s*\)/
    )
  }
)

test(
  'shows the support card when either detail exists',
  () => {
    assert.match(
      digitalPassSource,
      /const hasSupportDetails =\s*hasSupportedOrganization \|\|\s*hasSupportedCampaign/
    )

    assert.match(
      digitalPassSource,
      /\{hasSupportDetails \? \(/
    )

    assert.match(
      digitalPassSource,
      />\s*Supporting\s*</
    )
  }
)

test(
  'renders the organization independently inside the support card',
  () => {
    assert.match(
      digitalPassSource,
      /\{hasSupportedOrganization \? \([\s\S]*?\{\s*supportedOrganizationName\s*\}[\s\S]*?\) : null\}/
    )
  }
)

test(
  'renders the campaign independently with a fundraiser label',
  () => {
    assert.match(
      digitalPassSource,
      /\{hasSupportedCampaign \? \(/
    )

    assert.match(
      digitalPassSource,
      /Fundraiser:\{'\s'\}/
    )

    assert.match(
      digitalPassSource,
      /\{\s*supportedCampaignName\s*\}/
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
  'resolves the campaign name from the same linked purchase',
  () => {
    assert.match(
      dashboardSource,
      /const supportedCampaignName =\s*activePassPurchase\?\.campaigns\?\.name \|\|\s*null/
    )
  }
)

test(
  'passes both support details into the digital pass',
  () => {
    assert.match(
      dashboardSource,
      /<CustomerDigitalPass[\s\S]*?supportedOrganizationName=\{\s*supportedOrganizationName\s*\}[\s\S]*?supportedCampaignName=\{\s*supportedCampaignName\s*\}/
    )
  }
)

// =============================================================================
// Query efficiency
// =============================================================================

test(
  'uses the campaign already joined onto purchased passes',
  () => {
    assert.match(
      dashboardSource,
      /campaigns \(\s*id,\s*name,\s*description\s*\)/
    )

    assert.doesNotMatch(
      dashboardSource,
      /from\(['"]campaigns['"]\)[\s\S]*?supportedCampaignName/
    )
  }
)

// =============================================================================
// Existing behavior
// =============================================================================

test(
  'keeps the inactive pass path independent of support details',
  () => {
    assert.match(
      digitalPassSource,
      /if \(!hasActivePass\) \{\s*return <InactivePass \/>\s*\}/
    )
  }
)