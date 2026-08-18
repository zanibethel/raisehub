import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const stripeServerSource = fs.readFileSync(
  path.join(process.cwd(), 'src/lib/stripe/server.ts'),
  'utf8'
)
const successPageSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/checkout/success/page.tsx'),
  'utf8'
)

test('Stripe return URLs strip gift and claim-token query parameters', () => {
  assert.match(stripeServerSource, /SENSITIVE_RETURN_PARAM_NAMES/)
  assert.match(stripeServerSource, /'gift'/)
  assert.match(stripeServerSource, /'claim_token'/)
  assert.match(
    stripeServerSource,
    /success_url: stripSensitiveReturnParams\(input\.successUrl\)/
  )
})

test('checkout success page does not read or validate a raw gift token', () => {
  assert.doesNotMatch(successPageSource, /giftToken/)
  assert.doesNotMatch(successPageSource, /hashGiftClaimToken/)
  assert.doesNotMatch(successPageSource, /searchParams: Promise<\{[^}]*gift\?/)
  assert.match(successPageSource, /<GiftSharePanel giftId=\{paidAttempt\.gift_pass_id\} \/>/)
})
