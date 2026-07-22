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
// Assertion helpers
// =============================================================================

function assertSourceIncludes(
  source: string,
  expected: string
) {
  assert.ok(
    source.includes(expected),
    `Expected source to include: ${expected}`
  )
}

function countOccurrences(
  source: string,
  expected: string
): number {
  return source.split(expected).length - 1
}

// =============================================================================
// Digital pass props
// =============================================================================

test(
  'accepts optional support details and deal count',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'supportedOrganizationName?:'
    )

    assertSourceIncludes(
      digitalPassSource,
      'supportedCampaignName?:'
    )

    assertSourceIncludes(
      digitalPassSource,
      'availableOfferCount?: number | null'
    )
  }
)

test(
  'passes support details and deal count into the active pass',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'function ActivePass({'
    )

    assertSourceIncludes(
      digitalPassSource,
      'supportedOrganizationName,'
    )

    assertSourceIncludes(
      digitalPassSource,
      'supportedCampaignName,'
    )

    assertSourceIncludes(
      digitalPassSource,
      'availableOfferCount,'
    )

    assertSourceIncludes(
      digitalPassSource,
      'availableOfferCount={'
    )
  }
)

// =============================================================================
// Deal count normalization
// =============================================================================

test(
  'hides missing and invalid deal counts',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'function normalizeOfferCount('
    )

    assertSourceIncludes(
      digitalPassSource,
      "typeof value !== 'number'"
    )

    assertSourceIncludes(
      digitalPassSource,
      '!Number.isFinite(value)'
    )

    assertSourceIncludes(
      digitalPassSource,
      'return null'
    )
  }
)

test(
  'converts deal counts to nonnegative whole numbers',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'Math.floor(value)'
    )

    assertSourceIncludes(
      digitalPassSource,
      'Math.max('
    )
  }
)

test(
  'uses clear zero singular and plural deal labels',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      "return 'No active deals today'"
    )

    assertSourceIncludes(
      digitalPassSource,
      "value === 1 ? 'deal' : 'deals'"
    )

    assertSourceIncludes(
      digitalPassSource,
      '`${value} active ${'
    )
  }
)

test(
  'only shows the deal count badge for a normalized count',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'const normalizedOfferCount ='
    )

    assertSourceIncludes(
      digitalPassSource,
      'normalizeOfferCount('
    )

    assertSourceIncludes(
      digitalPassSource,
      'normalizedOfferCount !=='
    )

    assertSourceIncludes(
      digitalPassSource,
      'formatOfferCount('
    )
  }
)

test(
  'keeps the verified access badge beside the deal count',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'Verified access'
    )

    assertSourceIncludes(
      digitalPassSource,
      'flex shrink-0 flex-wrap items-center gap-2'
    )
  }
)

// =============================================================================
// Zero-deal guidance
// =============================================================================

test(
  'only activates zero-deal guidance for an exact normalized zero',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'const hasNoActiveOffers ='
    )

    assertSourceIncludes(
      digitalPassSource,
      'normalizedOfferCount === 0'
    )

    assert.equal(
      digitalPassSource.includes(
        '!normalizedOfferCount'
      ),
      false
    )
  }
)

test(
  'shows an accessible status panel when no deals are active',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'hasNoActiveOffers ?'
    )

    assertSourceIncludes(
      digitalPassSource,
      'role="status"'
    )

    assertSourceIncludes(
      digitalPassSource,
      'Your pass is active and ready.'
    )

    assertSourceIncludes(
      digitalPassSource,
      'There are no participating'
    )

    assertSourceIncludes(
      digitalPassSource,
      'deals available right now.'
    )
  }
)

test(
  'explains that offers may be added while the pass remains active',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'Businesses can add new offers'
    )

    assertSourceIncludes(
      digitalPassSource,
      'at any time, so check back'
    )

    assertSourceIncludes(
      digitalPassSource,
      'Your pass remains active'
    )

    assertSourceIncludes(
      digitalPassSource,
      'until its expiration date.'
    )
  }
)

test(
  'changes the primary shortcut for the zero-deal state',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      "?'Check for New Deals'"
        .replace("?'", "? '")
    )

    assertSourceIncludes(
      digitalPassSource,
      ": 'Browse Available Deals'"
    )

    assertSourceIncludes(
      digitalPassSource,
      'href="/dashboard#available-offers"'
    )
  }
)

test(
  'does not use the zero-deal panel for missing count data',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'normalizedOfferCount === 0'
    )

    assert.equal(
      digitalPassSource.includes(
        'normalizedOfferCount == null'
      ),
      false
    )

    assert.equal(
      digitalPassSource.includes(
        'availableOfferCount === 0'
      ),
      false
    )
  }
)

// =============================================================================
// Support details card
// =============================================================================

test(
  'normalizes blank organization and campaign names',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'const hasSupportedOrganization ='
    )

    assertSourceIncludes(
      digitalPassSource,
      'supportedOrganizationName?.trim()'
    )

    assertSourceIncludes(
      digitalPassSource,
      'const hasSupportedCampaign ='
    )

    assertSourceIncludes(
      digitalPassSource,
      'supportedCampaignName?.trim()'
    )
  }
)

test(
  'shows the support card when either detail exists',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'const hasSupportDetails ='
    )

    assertSourceIncludes(
      digitalPassSource,
      'hasSupportedOrganization ||'
    )

    assertSourceIncludes(
      digitalPassSource,
      'hasSupportedCampaign'
    )

    assertSourceIncludes(
      digitalPassSource,
      'hasSupportDetails ?'
    )

    assertSourceIncludes(
      digitalPassSource,
      'Supporting'
    )
  }
)

test(
  'renders the organization independently inside the support card',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'hasSupportedOrganization ?'
    )

    assertSourceIncludes(
      digitalPassSource,
      'supportedOrganizationName'
    )
  }
)

test(
  'renders the campaign independently with a fundraiser label',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'hasSupportedCampaign ?'
    )

    assertSourceIncludes(
      digitalPassSource,
      "Fundraiser:{' '}"
    )

    assertSourceIncludes(
      digitalPassSource,
      'supportedCampaignName'
    )
  }
)

test(
  'uses a responsive four-card active pass grid',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
    )
  }
)

// =============================================================================
// Active entitlement purchase connection
// =============================================================================

test(
  'uses the active entitlement purchase id to find the linked purchase',
  () => {
    assertSourceIncludes(
      dashboardSource,
      'const activePassPurchase ='
    )

    assertSourceIncludes(
      dashboardSource,
      'activeEntitlement?.purchase_id'
    )

    assertSourceIncludes(
      dashboardSource,
      'purchasedPasses.find('
    )

    assertSourceIncludes(
      dashboardSource,
      'purchase.id ==='
    )

    assertSourceIncludes(
      dashboardSource,
      'activeEntitlement.purchase_id'
    )
  }
)

test(
  'resolves the organization from the linked purchase',
  () => {
    assertSourceIncludes(
      dashboardSource,
      'activePassPurchase'
    )

    assertSourceIncludes(
      dashboardSource,
      'selected_organization_id'
    )

    assertSourceIncludes(
      dashboardSource,
      'organizationById.get('
    )
  }
)

test(
  'prefers organization display name over business name',
  () => {
    assertSourceIncludes(
      dashboardSource,
      'const supportedOrganizationName ='
    )

    assertSourceIncludes(
      dashboardSource,
      'activePassOrganization?.display_name ||'
    )

    assertSourceIncludes(
      dashboardSource,
      'activePassOrganization?.business_name ||'
    )
  }
)

test(
  'resolves the campaign name from the same linked purchase',
  () => {
    assertSourceIncludes(
      dashboardSource,
      'const supportedCampaignName ='
    )

    assertSourceIncludes(
      dashboardSource,
      'activePassPurchase?.campaigns?.name ||'
    )
  }
)

test(
  'passes support details into the digital pass',
  () => {
    assertSourceIncludes(
      dashboardSource,
      '<CustomerDigitalPass'
    )

    assertSourceIncludes(
      dashboardSource,
      'supportedOrganizationName={'
    )

    assertSourceIncludes(
      dashboardSource,
      'supportedCampaignName={'
    )
  }
)

// =============================================================================
// Active deal connection
// =============================================================================

test(
  'passes the enriched active offer count into the digital pass',
  () => {
    assertSourceIncludes(
      dashboardSource,
      'availableOfferCount={'
    )

    assertSourceIncludes(
      dashboardSource,
      'enrichedOffers.length'
    )
  }
)

test(
  'counts the same active offers rendered by the dashboard',
  () => {
    assertSourceIncludes(
      dashboardSource,
      'const enrichedOffers ='
    )

    assertSourceIncludes(
      dashboardSource,
      '(offers ?? []).map('
    )

    assertSourceIncludes(
      dashboardSource,
      'enrichOffer'
    )

    assertSourceIncludes(
      dashboardSource,
      'enrichedOffers={'
    )
  }
)

// =============================================================================
// Query efficiency
// =============================================================================

test(
  'uses the campaign already joined onto purchased passes',
  () => {
    assertSourceIncludes(
      dashboardSource,
      'campaigns ('
    )

    assertSourceIncludes(
      dashboardSource,
      'name,'
    )

    assert.equal(
      dashboardSource.includes(
        ".from('campaigns')"
      ),
      false
    )
  }
)

test(
  'uses the existing active offer query for the deal count',
  () => {
    assert.equal(
      countOccurrences(
        dashboardSource,
        ".from('offers')"
      ),
      2
    )

    assertSourceIncludes(
      dashboardSource,
      ".eq('is_active', true)"
    )

    assert.equal(
      dashboardSource.includes(
        ".select('count')"
      ),
      false
    )
  }
)

// =============================================================================
// Existing behavior
// =============================================================================

test(
  'keeps the inactive pass path independent of support and deal data',
  () => {
    assertSourceIncludes(
      digitalPassSource,
      'if (!hasActivePass) {'
    )

    assertSourceIncludes(
      digitalPassSource,
      'return <InactivePass />'
    )
  }
)