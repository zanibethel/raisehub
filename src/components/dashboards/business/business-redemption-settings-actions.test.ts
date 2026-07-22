import assert from 'node:assert/strict'
import {
  readFileSync,
} from 'node:fs'
import test from 'node:test'

// =============================================================================
// Source
// =============================================================================

const actionSource =
  readFileSync(
    new URL(
      './business-redemption-settings-actions.ts',
      import.meta.url
    ),
    'utf8'
  )

// =============================================================================
// Server action contract
// =============================================================================

test(
  'declares the module as server-only',
  () => {
    assert.match(
      actionSource,
      /^'use server'/
    )
  }
)

test(
  'exports the redemption method update action',
  () => {
    assert.match(
      actionSource,
      /export async function updateBusinessRedemptionMethodAction/
    )
  }
)

test(
  'returns a typed success or error result',
  () => {
    assert.match(
      actionSource,
      /export type UpdateBusinessRedemptionMethodResult/
    )

    assert.match(
      actionSource,
      /success: true/
    )

    assert.match(
      actionSource,
      /success: false/
    )
  }
)

// =============================================================================
// Validation
// =============================================================================

test(
  'uses the shared redemption method validator',
  () => {
    assert.match(
      actionSource,
      /isRedemptionMethod/
    )

    assert.match(
      actionSource,
      /if \(!isRedemptionMethod\(value\)\)/
    )
  }
)

test(
  'rejects redemption methods that are not launch available',
  () => {
    assert.match(
      actionSource,
      /isRedemptionMethodAvailable/
    )

    assert.match(
      actionSource,
      /if \(!isRedemptionMethodAvailable\(value\)\)/
    )

    assert.match(
      actionSource,
      /still planned and cannot be selected yet/
    )
  }
)

test(
  'validates before creating the Supabase client',
  () => {
    const validationIndex =
      actionSource.indexOf(
        'if (!isRedemptionMethod(value))'
      )

    const availabilityIndex =
      actionSource.indexOf(
        'if (!isRedemptionMethodAvailable(value))'
      )

    const clientIndex =
      actionSource.indexOf(
        'const supabase = await createClient()'
      )

    assert.notEqual(
      validationIndex,
      -1
    )

    assert.notEqual(
      availabilityIndex,
      -1
    )

    assert.notEqual(
      clientIndex,
      -1
    )

    assert.equal(
      validationIndex < clientIndex,
      true
    )

    assert.equal(
      availabilityIndex < clientIndex,
      true
    )
  }
)

// =============================================================================
// Authentication
// =============================================================================

test(
  'requires an authenticated user',
  () => {
    assert.match(
      actionSource,
      /supabase\.auth\.getUser\(\)/
    )

    assert.match(
      actionSource,
      /if \(!user\)/
    )

    assert.match(
      actionSource,
      /You must be logged in to update redemption settings/
    )
  }
)

// =============================================================================
// Database write
// =============================================================================

test(
  'updates only the authenticated profile',
  () => {
    assert.match(
      actionSource,
      /\.from\('profiles'\)/
    )

    assert.match(
      actionSource,
      /\.update\(\{\s*redemption_method: value,?\s*}\)/
    )

    assert.match(
      actionSource,
      /\.eq\('id', user\.id\)/
    )
  }
)

test(
  'does not insert or upsert profile records',
  () => {
    assert.doesNotMatch(
      actionSource,
      /\.insert\(/
    )

    assert.doesNotMatch(
      actionSource,
      /\.upsert\(/
    )
  }
)

// =============================================================================
// Error handling
// =============================================================================

test(
  'detects missing redemption method column errors',
  () => {
    assert.match(
      actionSource,
      /error\.code === '42703'/
    )

    assert.match(
      actionSource,
      /error\.code === 'PGRST204'/
    )

    assert.match(
      actionSource,
      /\.includes\('redemption_method'\) === true/
    )
  }
)

test(
  'returns a database migration message for a missing column',
  () => {
    assert.match(
      actionSource,
      /required database update has not been applied/
    )
  }
)

test(
  'does not expose raw database error messages',
  () => {
    assert.doesNotMatch(
      actionSource,
      /error\.message\s*}/
    )

    assert.doesNotMatch(
      actionSource,
      /error:\s*error\.message/
    )
  }
)

// =============================================================================
// Successful completion
// =============================================================================

test(
  'revalidates the dashboard after a successful update',
  () => {
    assert.match(
      actionSource,
      /revalidatePath\('\/dashboard'\)/
    )
  }
)

test(
  'returns the saved redemption method on success',
  () => {
    assert.match(
      actionSource,
      /success: true,\s*redemptionMethod: value/
    )
  }
)