export type StripeCheckoutCompletionLike = {
  type: string
  paymentStatus?: string | null
}

export function isPendingAsyncCheckoutCompletion(
  event: StripeCheckoutCompletionLike
) {
  return (
    event.type === 'checkout.session.completed' &&
    event.paymentStatus !== 'paid' &&
    event.paymentStatus !== 'no_payment_required'
  )
}

/** Reject checkout events that cannot be tied to an existing attempt. */
export function requireCheckoutAttemptId(metadata: Record<string, string> | null | undefined) {
  const attemptId = metadata?.checkout_attempt_id?.trim()
  if (!attemptId) throw new Error('Checkout attempt metadata is missing')
  return attemptId
}
