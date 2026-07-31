import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
const removeActionStart = actionsSource.indexOf(
  'export async function removeSavedOfferAction'
)

assert.notEqual(removeActionStart, -1)

const removeActionSource = actionsSource.slice(removeActionStart)

test('preserves the environment-scoped saved-offer lookup before removal', () => {
  assert.match(
    removeActionSource,
    /\.from\('saved_offers'\)\s+\.select\('id, is_demo, demo_group'\)/
  )
  assert.match(removeActionSource, /applyEnvironmentScope\(\s*savedOfferQuery,\s*environment/)
  assert.match(removeActionSource, /\.eq\('user_id', user\.id\)/)
  assert.match(
    removeActionSource,
    /\.eq\(\s*'offer_id',\s*normalizedOfferId\s*\)/
  )
})

test('checks redemption history before deleting a saved offer', () => {
  const redemptionLookupIndex = removeActionSource.indexOf(".from('redemptions')")
  const deleteIndex = removeActionSource.search(
    /\.from\('saved_offers'\)\s+\.delete\(\)/
  )

  assert.notEqual(redemptionLookupIndex, -1)
  assert.notEqual(deleteIndex, -1)
  assert.equal(redemptionLookupIndex < deleteIndex, true)
})

test('checks the authenticated customer redemption record in the environment', () => {
  assert.match(
    removeActionSource,
    /\.from\('redemptions'\)\s+\.select\('offer_id, is_demo, demo_group'\)/
  )
  assert.match(
    removeActionSource,
    /\.eq\('user_id', user\.id\)\s+\.eq\(\s*'offer_id',\s*normalizedOfferId\s*\)/
  )
  assert.match(removeActionSource, /applyEnvironmentScope\(\s*redemptionQuery,\s*environment/)
  assert.match(removeActionSource, /\.maybeSingle\(\)/)
})

test('handles redemption lookup failures safely', () => {
  assert.match(removeActionSource, /if \(redemptionError\)/)
  assert.match(
    removeActionSource,
    /We could not verify this offer’s redemption history\. Please try again\./
  )
})

test('blocks removal when a redemption exists', () => {
  assert.match(removeActionSource, /if \(redemption\)/)
  assert.match(
    removeActionSource,
    /Used deals are kept in My Pass as part of your redemption history\./
  )
})

test('returns before the delete query when a redemption exists', () => {
  const redeemedGuardIndex = removeActionSource.indexOf('if (redemption)')
  const redeemedMessageIndex = removeActionSource.indexOf(
    'Used deals are kept in My Pass',
    redeemedGuardIndex
  )
  const deleteIndex = removeActionSource.search(
    /\.from\('saved_offers'\)\s+\.delete\(\)/
  )

  assert.notEqual(redeemedGuardIndex, -1)
  assert.notEqual(redeemedMessageIndex, -1)
  assert.notEqual(deleteIndex, -1)
  assert.equal(redeemedGuardIndex < redeemedMessageIndex, true)
  assert.equal(redeemedMessageIndex < deleteIndex, true)
})

test('preserves environment-scoped saved-offer deletion for unused deals', () => {
  assert.match(
    removeActionSource,
    /\.from\('saved_offers'\)\s+\.delete\(\)\s+\.eq\('id', savedOffer\.id\)\s+\.eq\('user_id', user\.id\)/
  )
  assert.match(
    removeActionSource,
    /deleteQuery = applyEnvironmentScope\(deleteQuery, environment\)/
  )
  assert.match(
    removeActionSource,
    /revalidateCustomerOfferPaths\(\s*normalizedOfferId\s*\)/
  )
  assert.match(removeActionSource, /return \{ status: 'success' \}/)
})
