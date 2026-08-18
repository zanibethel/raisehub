import assert from 'node:assert/strict'
import test from 'node:test'

import { isPendingAsyncCheckoutCompletion } from './checkout-event-state'

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
