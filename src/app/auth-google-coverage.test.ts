import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

test('every standalone signup surface offers Google OAuth', () => {
  const business = source('./signup/business/page.tsx')
  const organization = source('./signup/organization/page.tsx')
  const customer = source('./signup/signup-form.tsx')
  const seller = source('./signup/seller/page.tsx')

  for (const signupSource of [business, organization, customer, seller]) {
    assert.match(signupSource, /GoogleOAuthButton/)
  }

  assert.match(business, /\/workspace\/new\/business/)
  assert.match(organization, /\/workspace\/new\/organization/)
  assert.match(customer, /GoogleOAuthButton destination=\{destination\}/)
  assert.match(seller, /GoogleOAuthButton destination=\{destination\}/)
})

test('existing sign-in surfaces keep Google OAuth available', () => {
  const login = source('./login/page.tsx')
  const giftClaim = source('./gifts/claim/[token]/gift-claim-auth.tsx')

  assert.match(login, /signInWithOAuth/)
  assert.match(login, /provider:\s*'google'|handleOAuth\('google'\)/)
  assert.match(giftClaim, /continueWithGoogle/)
  assert.match(giftClaim, /provider:\s*'google'/)
})
