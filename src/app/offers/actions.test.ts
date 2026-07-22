import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// =============================================================================
// Source
// =============================================================================

const actionsSource = readFileSync(
  new URL(
    './actions.ts',
    import.meta.url
  ),
  'utf8'
)

// =============================================================================
// Remove action structure
// =============================================================================

test(
  'preserves the saved-offer lookup before removal',
  () => {
    assert.match(
      actionsSource,
      /\.from\('saved_offers'\)\s+\.select\('id'\)/
    )

    assert.match(
      actionsSource,
      /\.eq\('user_id', user\.id\)/
    )

    assert.match(
      actionsSource,
      /\.eq\(\s*'offer_id',\s*normalizedOfferId\s*\)/
    )
  }
)

test(
  'checks redemption history before deleting a saved offer',
  () => {
    const redemptionLookupIndex =
      actionsSource.indexOf(
        ".from('redemptions')"
      )

    const deleteIndex =
      actionsSource.indexOf(
        ".from('saved_offers')\n      .delete()"
      )

    assert.notEqual(
      redemptionLookupIndex,
      -1
    )

    assert.notEqual(
      deleteIndex,
      -1
    )

    assert.equal(
      redemptionLookupIndex <
        deleteIndex,
      true
    )
  }
)

// =============================================================================
// Redemption lookup
// =============================================================================

test(
  'checks the authenticated customer redemption record',
  () => {
    assert.match(
      actionsSource,
      /\.from\('redemptions'\)\s+\.select\('offer_id'\)/
    )

    assert.match(
      actionsSource,
      /\.eq\('user_id', user\.id\)\s+\.eq\(\s*'offer_id',\s*normalizedOfferId\s*\)/
    )

    assert.match(
      actionsSource,
      /\.limit\(1\)\s+\.maybeSingle\(\)/
    )
  }
)

test(
  'handles redemption lookup failures safely',
  () => {
    assert.match(
      actionsSource,
      /if \(redemptionError\)/
    )

    assert.match(
      actionsSource,
      /We could not verify this offer’s redemption history\. Please try again\./
    )
  }
)

test(
  'blocks removal when a redemption exists',
  () => {
    assert.match(
      actionsSource,
      /if \(redemption\)/
    )

    assert.match(
      actionsSource,
      /Used deals are kept in My Pass as part of your redemption history\./
    )
  }
)

// =============================================================================
// Deletion protection
// =============================================================================

test(
  'returns before the delete query when a redemption exists',
  () => {
    const redeemedGuardIndex =
      actionsSource.indexOf(
        'if (redemption)'
      )

    const redeemedMessageIndex =
      actionsSource.indexOf(
        'Used deals are kept in My Pass',
        redeemedGuardIndex
      )

    const deleteIndex =
      actionsSource.indexOf(
        ".from('saved_offers')\n      .delete()"
      )

    assert.notEqual(
      redeemedGuardIndex,
      -1
    )

    assert.notEqual(
      redeemedMessageIndex,
      -1
    )

    assert.notEqual(
      deleteIndex,
      -1
    )

    assert.equal(
      redeemedGuardIndex <
        redeemedMessageIndex,
      true
    )

    assert.equal(
      redeemedMessageIndex <
        deleteIndex,
      true
    )
  }
)

test(
  'preserves saved-offer deletion for unused deals',
  () => {
    assert.match(
      actionsSource,
      /\.from\('saved_offers'\)\s+\.delete\(\)\s+\.eq\('id', savedOffer\.id\)\s+\.eq\('user_id', user\.id\)/
    )

    assert.match(
      actionsSource,
      /revalidateCustomerOfferPaths\(\s*normalizedOfferId\s*\)/
    )

    assert.match(
      actionsSource,
      /return \{\s*status: 'success',\s*\}/
    )
  }
)