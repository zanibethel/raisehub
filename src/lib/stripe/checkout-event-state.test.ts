import assert from 'node:assert/strict'
import test from 'node:test'

import { isPendingAsyncCheckoutCompletion, requireCheckoutAttemptId } from './checkout-event-state'

test('unpaid checkout.session.completed is treated as payment pending', () => {
  assert.equal(
    isPendingAsyncCheckoutCompletion({
      type: 'checkout.session.completed',
      paymentStatus: 'unpaid',
    }),
    true
  )
})

test('paid checkout completion is not treated as pending', () => {
  assert.equal(
    isPendingAsyncCheckoutCompletion({
      type: 'checkout.session.completed',
      paymentStatus: 'paid',
    }),
    false
  )

  assert.equal(
    isPendingAsyncCheckoutCompletion({
      type: 'checkout.session.completed',
      paymentStatus: 'no_payment_required',
    }),
    false
  )
})

test('async success is never treated as a pending completion event', () => {
  assert.equal(
    isPendingAsyncCheckoutCompletion({
      type: 'checkout.session.async_payment_succeeded',
      paymentStatus: 'paid',
    }),
    false
  )
})

test('rejects missing, null, and whitespace-only checkout attempt metadata', () => {
  for (const metadata of [null, undefined, {}, { checkout_attempt_id: '  ' }]) {
    assert.throws(() => requireCheckoutAttemptId(metadata), /Checkout attempt metadata is missing/)
  }
})

test('accepts and trims a valid checkout attempt identifier', () => {
  assert.equal(requireCheckoutAttemptId({ checkout_attempt_id: '  attempt_123  ' }), 'attempt_123')
})
