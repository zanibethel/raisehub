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

test(
  'campaign checkout organization stays locked to the campaign sponsor',
  () => {
    assert.ok(
      buyButtonSource.includes(
        'const selectedOrganizationId = defaultOrganizationId ?? organizations[0]?.id ??'
      )
    )

    assert.ok(
      buyButtonSource.includes(
        'This campaign supports its sponsoring organization.'
      )
    )

    assert.ok(
      !buyButtonSource.includes(
        'Support a different organization'
      )
    )

    assert.ok(
      !buyButtonSource.includes(
        'organization-to-support'
      )
    )

    assert.ok(
      !buyButtonSource.includes(
        'setSelectedOrganizationId('
      )
    )

    assert.ok(
      !buyButtonSource.includes(
        'setShowOrganizationPicker('
      )
    )
  }
)
