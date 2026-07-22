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
  'accepts optional support details and deal count',
  () => {
    assert.match(
      digitalPassSource,
      /supportedOrganizationName\?:\s*string \| null/
    )

    assert.match(
      digitalPassSource,
      /supportedCampaignName\?:\s*string \| null/
    )

    assert.match(
      digitalPassSource,
      /availableOfferCount\?:\s*number \| null/
    )
  }
)

test(
  'passes support details and deal count into the active pass',
  () => {
    assert.match(
      digitalPassSource,
      /function ActivePass\(\{[\s\S]*?supportedOrganizationName,[\s\S]*?supportedCampaignName,[\s\S]*?availableOfferCount,[\s\S]*?\}: \{/
    )

    assert.match(
      digitalPassSource,
      /<ActivePass[\s\S]*?supportedOrganizationName=\{\s*supportedOrganizationName\s*\}[\s\S]*?supportedCampaignName=\{\s*supportedCampaignName\s*\}[\s\S]*?availableOfferCount=\{\s*availableOfferCount\s*\}/
    )
  }
)

// =============================================================================
// Deal count normalization
// =============================================================================

test(
  'hides missing and invalid deal counts',
  () => {
    assert.match(
      digitalPassSource,
      /function normalizeOfferCount\(\s*value: number \| null \| undefined\s*\): number \| null/
    )

    assert.match(
      digitalPassSource,
      /typeof value !== 'number' \|\|\s*!Number\.isFinite\(value\)/
    )

    assert.match(
      digitalPassSource,
      /return null/
    )
  }
)

test(
  'converts deal counts to nonnegative whole numbers',
  () => {
    assert.match(
      digitalPassSource,
      /Math\.max\(\s*Math\.floor\(value\),\s*0\s*\)/
    )
  }
)

test(
  'uses clear zero singular and plural deal labels',
  () => {
    assert.match(
      digitalPassSource,
      /if \(value === 0\) \{\s*return 'No active deals today'\s*\}/
    )

    assert.match(
      digitalPassSource,
      /value === 1 \? 'deal' : 'deals'/
    )

    assert.match(
      digitalPassSource,
      /`\$\{value\} active \$\{/
    )
  }
)

test(
  'only shows the deal count badge for a normalized count',
  () => {
    assert.match(
      digitalPassSource,
      /const normalizedOfferCount =\s*normalizeOfferCount$begin:math:text$\\s\*availableOfferCount\\s\*$end:math:text$/
    )

    assert.match(
      digitalPassSource,
      /\{normalizedOfferCount !==\s*null \? $begin:math:text$\/
    \)

    assert\.match\(
      digitalPassSource\,
      \/formatOfferCount\\\(\\s\*normalizedOfferCount\\s\*$end:math:text$/
    )
  }
)

test(
  'keeps the verified access badge beside the deal count',
  () => {
    assert.match(
      digitalPassSource,
      />\s*Verified access\s*</
    )

    assert.match(
      digitalPassSource,
      /flex shrink-0 flex-wrap items-center gap-2/
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
      /const hasSupportedOrganization =\s*Boolean$begin:math:text$\\s\*supportedOrganizationName\\\?\\\.trim\\\($end:math:text$\s*\)/
    )

    assert.match(
      digitalPassSource,
      /const hasSupportedCampaign =\s*Boolean$begin:math:text$\\s\*supportedCampaignName\\\?\\\.trim\\\($end:math:text$\s*\)/
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
      /\{hasSupportDetails \? $begin:math:text$\/
    \)

    assert\.match\(
      digitalPassSource\,
      \/\>\\s\*Supporting\\s\*\<\/
    \)
  \}
\)

test\(
  \'renders the organization independently inside the support card\'\,
  \(\) \=\> \{
    assert\.match\(
      digitalPassSource\,
      \/\\\{hasSupportedOrganization \\\? \\\(\[\\s\\S\]\*\?\\\{\\s\*supportedOrganizationName\\s\*\\\}\[\\s\\S\]\*\?$end:math:text$ : null\}/
    )
  }
)

test(
  'renders the campaign independently with a fundraiser label',
  () => {
    assert.match(
      digitalPassSource,
      /\{hasSupportedCampaign \? $begin:math:text$\/
    \)

    assert\.match\(
      digitalPassSource\,
      \/Fundraiser\:\\\{\'\\s\'\\\}\/
    \)

    assert\.match\(
      digitalPassSource\,
      \/\\\{\\s\*supportedCampaignName\\s\*\\\}\/
    \)
  \}
\)

test\(
  \'uses a responsive four\-card active pass grid\'\,
  \(\) \=\> \{
    assert\.match\(
      digitalPassSource\,
      \/mt\-7 grid gap\-3 sm\:grid\-cols\-2 lg\:grid\-cols\-4\/
    \)
  \}
\)

\/\/ \=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=
\/\/ Active entitlement purchase connection
\/\/ \=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=\=

test\(
  \'uses the active entitlement purchase id to find the linked purchase\'\,
  \(\) \=\> \{
    assert\.match\(
      dashboardSource\,
      \/const activePassPurchase \=\\s\*activeEntitlement\\\?\\\.purchase\_id\\s\*\\\?\\s\*purchasedPasses\\\.find\/
    \)

    assert\.match\(
      dashboardSource\,
      \/purchase\\\.id \=\=\=\\s\*activeEntitlement\\\.purchase\_id\/
    \)
  \}
\)

test\(
  \'resolves the organization from the linked purchase\'\,
  \(\) \=\> \{
    assert\.match\(
      dashboardSource\,
      \/activePassPurchase\\s\*\\\?\\\.selected\_organization\_id\/
    \)

    assert\.match\(
      dashboardSource\,
      \/organizationById\\\.get\\\(\\s\*activePassPurchase\\s\*\\\.selected\_organization\_id\\s\*$end:math:text$/
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
  'passes support details into the digital pass',
  () => {
    assert.match(
      dashboardSource,
      /<CustomerDigitalPass[\s\S]*?supportedOrganizationName=\{\s*supportedOrganizationName\s*\}[\s\S]*?supportedCampaignName=\{\s*supportedCampaignName\s*\}/
    )
  }
)

// =============================================================================
// Active deal connection
// =============================================================================

test(
  'passes the enriched active offer count into the digital pass',
  () => {
    assert.match(
      dashboardSource,
      /availableOfferCount=\{\s*enrichedOffers\.length\s*\}/
    )
  }
)

test(
  'counts the same active offers rendered by the dashboard',
  () => {
    assert.match(
      dashboardSource,
      /const enrichedOffers =\s*$begin:math:text$offers \\\?\\\? \\\[\\\]$end:math:text$\.map$begin:math:text$\\s\*enrichOffer\\s\*$end:math:text$/
    )

    assert.match(
      dashboardSource,
      /enrichedOffers=\{\s*enrichedOffers\s*\}/
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
      /campaigns $begin:math:text$\\s\*id\,\\s\*name\,\\s\*description\\s\*$end:math:text$/
    )

    assert.doesNotMatch(
      dashboardSource,
      /from$begin:math:text$\[\'\"\]campaigns\[\'\"\]$end:math:text$[\s\S]*?supportedCampaignName/
    )
  }
)

test(
  'uses the existing active offer query for the deal count',
  () => {
    const offerQueryMatches =
      dashboardSource.match(
        /\.from$begin:math:text$\[\'\"\]offers\[\'\"\]$end:math:text$/g
      ) ?? []

    assert.equal(
      offerQueryMatches.length,
      2
    )

    assert.match(
      dashboardSource,
      /\.eq$begin:math:text$\[\'\"\]is\_active\[\'\"\]\, true$end:math:text$/
    )

    assert.doesNotMatch(
      dashboardSource,
      /\.select$begin:math:text$\[\'\"\]count\[\'\"\]$end:math:text$/
    )
  }
)

// =============================================================================
// Existing behavior
// =============================================================================

test(
  'keeps the inactive pass path independent of support and deal data',
  () => {
    assert.match(
      digitalPassSource,
      /if $begin:math:text$\!hasActivePass$end:math:text$ \{\s*return <InactivePass \/>\s*\}/
    )
  }
)