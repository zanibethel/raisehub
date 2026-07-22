import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const purchaseHistorySource = readFileSync(
  new URL(
    './sections/customer-passes-section.tsx',
    import.meta.url
  ),
  'utf8'
)

test(
  'shows pass and donation amounts separately',
  () => {
    assert.ok(
      purchaseHistorySource.includes(
        'donation_amount?: number | null'
      )
    )

    assert.ok(
      purchaseHistorySource.includes(
        'function getPassAmount('
      )
    )

    assert.ok(
      purchaseHistorySource.includes(
        'Passes and optional donations'
      )
    )

    assert.ok(
      purchaseHistorySource.includes(
        'Extra Donations'
      )
    )
  }
)

test(
  'includes confirmation-style purchase details',
  () => {
    assert.ok(
      purchaseHistorySource.includes(
        'Purchase date'
      )
    )

    assert.ok(
      purchaseHistorySource.includes(
        'Reference'
      )
    )

    assert.ok(
      purchaseHistorySource.includes(
        'getPurchaseReference('
      )
    )

    assert.ok(
      purchaseHistorySource.includes(
        'Includes Donation'
      )
    )
  }
)

test(
  'keeps purchase actions usable on phones',
  () => {
    assert.ok(
      purchaseHistorySource.includes(
        'min-h-11 w-full'
      )
    )

    assert.ok(
      purchaseHistorySource.includes(
        'sm:w-auto'
      )
    )
  }
)
