import assert from 'node:assert/strict'
import {
  readFileSync,
} from 'node:fs'
import test from 'node:test'

// =============================================================================
// Migration source
// =============================================================================

const migrationSource =
  readFileSync(
    new URL(
      '../../../supabase/migrations/20260722014500_add_profile_redemption_method.sql',
      import.meta.url
    ),
    'utf8'
  )

// =============================================================================
// Column foundation
// =============================================================================

test(
  'adds the profile redemption method column safely',
  () => {
    assert.match(
      migrationSource,
      /alter table public\.profiles\s+add column if not exists redemption_method text;/i
    )
  }
)

test(
  'backfills existing profiles with staff confirmation',
  () => {
    assert.match(
      migrationSource,
      /update public\.profiles\s+set redemption_method = 'staff_confirmation'\s+where redemption_method is null;/i
    )
  }
)

test(
  'sets staff confirmation as the database default',
  () => {
    assert.match(
      migrationSource,
      /alter table public\.profiles\s+alter column redemption_method\s+set default 'staff_confirmation';/i
    )
  }
)

test(
  'prevents null redemption methods after backfill',
  () => {
    const backfillIndex =
      migrationSource.indexOf(
        "set redemption_method = 'staff_confirmation'"
      )

    const notNullIndex =
      migrationSource.indexOf(
        'set not null'
      )

    assert.notEqual(
      backfillIndex,
      -1
    )

    assert.notEqual(
      notNullIndex,
      -1
    )

    assert.equal(
      backfillIndex < notNullIndex,
      true
    )
  }
)

// =============================================================================
// Supported values
// =============================================================================

test(
  'restricts redemption methods to supported architecture values',
  () => {
    assert.match(
      migrationSource,
      /profiles_redemption_method_check/
    )

    for (
      const method of [
        'staff_confirmation',
        'qr_code',
        'staff_code',
        'square',
      ]
    ) {
      assert.match(
        migrationSource,
        new RegExp(`'${method}'`)
      )
    }
  }
)

test(
  'replaces the check constraint safely',
  () => {
    const dropConstraintIndex =
      migrationSource.indexOf(
        'drop constraint if exists profiles_redemption_method_check'
      )

    const addConstraintIndex =
      migrationSource.indexOf(
        'add constraint profiles_redemption_method_check'
      )

    assert.notEqual(
      dropConstraintIndex,
      -1
    )

    assert.notEqual(
      addConstraintIndex,
      -1
    )

    assert.equal(
      dropConstraintIndex <
        addConstraintIndex,
      true
    )
  }
)

// =============================================================================
// Documentation and safety
// =============================================================================

test(
  'documents the profile redemption method column',
  () => {
    assert.match(
      migrationSource,
      /comment on column public\.profiles\.redemption_method/i
    )

    assert.match(
      migrationSource,
      /Staff confirmation is the launch default/i
    )
  }
)

test(
  'does not remove or rename existing profile columns',
  () => {
    assert.doesNotMatch(
      migrationSource,
      /drop column/i
    )

    assert.doesNotMatch(
      migrationSource,
      /rename column/i
    )
  }
)