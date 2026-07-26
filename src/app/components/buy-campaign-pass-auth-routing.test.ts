import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const buyButtonSource = readFileSync(
  new URL(
    './buy-campaign-pass-button.tsx',
    import.meta.url
  ),
  'utf8'
)

const signupPageSource = readFileSync(
  new URL(
    '../signup/page.tsx',
    import.meta.url
  ),
  'utf8'
)

test(
  'sends logged-out supporters to signup with the selected campaign',
  () => {
    assert.ok(
      buyButtonSource.includes(
        "new URLSearchParams({ campaignId, source: 'campaign' })"
      )
    )

    assert.ok(
      buyButtonSource.includes(
        'router.push(`/signup?${signupParams.toString()}`)'
      )
    )

    assert.ok(
      buyButtonSource.includes(
        'campaignId'
      )
    )
  }
)

test(
  'signup reuses an existing authenticated session',
  () => {
    assert.ok(
      signupPageSource.includes(
        'await supabase.auth.getUser()'
      )
    )

    assert.ok(
      signupPageSource.includes(
        'redirect('
      )
    )
  }
)
