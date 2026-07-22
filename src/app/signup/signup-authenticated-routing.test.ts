import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const signupPageSource = readFileSync(
  new URL('./page.tsx', import.meta.url),
  'utf8'
)

test(
  'redirects an authenticated user instead of rendering another signup form',
  () => {
    assert.ok(
      signupPageSource.includes(
        'await supabase.auth.getUser()'
      )
    )

    assert.ok(
      signupPageSource.includes('if (user)')
    )

    assert.ok(
      signupPageSource.includes(
        'buildAuthenticatedDestination'
      )
    )

    assert.ok(
      signupPageSource.includes('redirect(')
    )
  }
)

test(
  'preserves the selected fundraiser and support context',
  () => {
    assert.ok(
      signupPageSource.includes(
        '`/campaigns/${input.campaignId}?${query}`'
      )
    )

    assert.ok(
      signupPageSource.includes(
        "searchParams.set('seller', input.seller)"
      )
    )

    assert.ok(
      signupPageSource.includes(
        "searchParams.set('donation', input.donation)"
      )
    )

    assert.ok(
      signupPageSource.includes(
        "'organization',"
      )
    )
  }
)

test(
  'keeps offers and campaign fallbacks safe and internal',
  () => {
    assert.ok(
      signupPageSource.includes("? '/offers'")
    )

    assert.ok(
      signupPageSource.includes(": '/campaigns'")
    )
  }
)
