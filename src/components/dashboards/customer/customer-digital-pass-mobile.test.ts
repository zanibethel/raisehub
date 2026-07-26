import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const digitalPassSource = readFileSync(
  new URL(
    './customer-digital-pass.tsx',
    import.meta.url
  ),
  'utf8'
)

test(
  'keeps the zero-deal status panel mobile friendly',
  () => {
    assert.ok(
      digitalPassSource.includes(
        'className="mt-4 rounded-2xl border border-white/25 bg-white/15 p-3.5 backdrop-blur"'
      )
    )

    assert.ok(
      digitalPassSource.includes(
        'role="status"'
      )
    )
  }
)

test(
  'keeps the zero-deal primary action full width on phones',
  () => {
    assert.ok(
      digitalPassSource.includes(
        'className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-green-700 transition hover:bg-green-50"'
      )
    )

    assert.ok(
      digitalPassSource.includes(
        "? 'Check for New Deals'"
      )
    )
  }
)
