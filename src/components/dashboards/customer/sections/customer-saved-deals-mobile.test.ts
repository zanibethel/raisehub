import assert from 'node:assert/strict'

import {

  readFileSync,

} from 'node:fs'

import test from 'node:test'

// =============================================================================

// Source

// =============================================================================

const sectionSource =

  readFileSync(

    new URL(

      './customer-saved-deals-section.tsx',

      import.meta.url

    ),

    'utf8'

  )

// =============================================================================

// Mobile section layout

// =============================================================================

test(

  'uses compact mobile padding for the My Pass summary',

  () => {

    assert.match(

      sectionSource,

      /bg-white\/90 p-4 shadow-xl backdrop-blur sm:p-8/

    )

  }

)

test(

  'uses compact mobile padding for saved deal cards',

  () => {

    assert.match(

      sectionSource,

      /bg-white\/90 p-4 shadow-xl backdrop-blur sm:p-6/

    )

  }

)

// =============================================================================

// Saved deal heading and status

// =============================================================================

test(

  'stacks the offer heading and status on narrow screens',

  () => {

    assert.match(

      sectionSource,

      /flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between/

    )

  }

)

test(

  'keeps Ready and Used badges content width',

  () => {

    assert.match(

      sectionSource,

      /w-fit shrink-0 rounded-full bg-gray-100/

    )

    assert.match(

      sectionSource,

      /w-fit shrink-0 rounded-full bg-yellow-50/

    )

  }

)

test(

  'preserves Ready and Used status labels',

  () => {

    assert.match(

      sectionSource,

      /\? 'Used'\s*: 'Ready'/

    )

  }

)

// =============================================================================

// Business information

// =============================================================================

test(

  'uses a responsive business information grid',

  () => {

    assert.match(

      sectionSource,

      /<dl className="mt-4 grid gap-4 rounded-2xl bg-gray-50 p-4 text-sm sm:grid-cols-2">/

    )

  }

)

test(

  'protects business information from horizontal overflow',

  () => {

    const minimumWidthOccurrences =

      sectionSource.match(

        /<div className="min-w-0">/g

      ) ?? []

    assert.equal(

      minimumWidthOccurrences.length >= 3,

      true

    )

  }

)

test(

  'preserves callable phone links',

  () => {

    assert.match(

      sectionSource,

      /href=\{`tel:\$\{phone\}`\}/

    )

    assert.match(

      sectionSource,

      /\{phone\}/

    )

  }

)

test(

  'preserves the business address',

  () => {

    assert.match(

      sectionSource,

      /\{address\}/

    )

    assert.match(

      sectionSource,

      /Location/

    )

  }

)

test(

  'preserves the offer expiration date',

  () => {

    assert.match(

      sectionSource,

      /Offer ends/

    )

    assert.match(

      sectionSource,

      /formatCustomerSavedDealEndDate/

    )

  }

)

// =============================================================================

// Deal actions

// =============================================================================

test(

  'preserves the deal detail link',

  () => {

    assert.match(

      sectionSource,

      /href=\{`\/offers\/\$\{offer\.id\}`\}/

    )

    assert.match(

      sectionSource,

      /View Deal Details/

    )

  }

)

test(

  'preserves the map action',

  () => {

    assert.match(

      sectionSource,

      /href=\{mapUrl\}/

    )

    assert.match(

      sectionSource,

      /target="_blank"/

    )

    assert.match(

      sectionSource,

      /View Map/

    )

  }

)

test(

  'preserves the use-offer action for ready deals',

  () => {

    assert.match(

      sectionSource,

      /<UseOfferButton/

    )

    assert.match(

      sectionSource,

      /offerId=\{offer\.id\}/

    )

  }

)

test(

  'preserves the remove-from-pass action',

  () => {

    assert.match(

      sectionSource,

      /removeSavedOfferAction/

    )

    assert.match(

      sectionSource,

      /Remove from My Pass/

    )

    assert.match(

      sectionSource,

      /window\.confirm/

    )

  }

)

// =============================================================================

// Saved deal organization

// =============================================================================

test(

  'keeps ready deals before used deals',

  () => {

    const readySectionIndex =

      sectionSource.indexOf(

        'customer-ready-to-use-deals-heading'

      )

    const usedSectionIndex =

      sectionSource.indexOf(

        'customer-used-deals-heading'

      )

    assert.notEqual(

      readySectionIndex,

      -1

    )

    assert.notEqual(

      usedSectionIndex,

      -1

    )

    assert.equal(

      readySectionIndex < usedSectionIndex,

      true

    )

  }

)

test(

  'preserves the ready-to-use deal group',

  () => {

    assert.match(

      sectionSource,

      /readyToUse\.map/

    )

    assert.match(

      sectionSource,

      /Ready to Use/

    )

    assert.match(

      sectionSource,

      /readyToUseCountLabel/

    )

  }

)

test(

  'preserves used deals as customer history',

  () => {

    assert.match(

      sectionSource,

      /used\.map/

    )

    assert.match(

      sectionSource,

      /Used Deals/

    )

    assert.match(

      sectionSource,

      /usedDealCountLabel/

    )

  }

)

test(

  'preserves the recorded redemption date',

  () => {

    assert.match(

      sectionSource,

      /formatCustomerSavedDealRedemptionDate/

    )

    assert.match(

      sectionSource,

      /redemptionDateByOfferId\.get/

    )

    assert.match(

      sectionSource,

      /Used on/

    )

  }

)

// =============================================================================

// Empty-state guidance

// =============================================================================

test(

  'preserves guidance back to available offers',

  () => {

    assert.match(

      sectionSource,

      /href="#available-offers"/

    )

    assert.match(

      sectionSource,

      /Browse Available Deals/

    )

  }

)