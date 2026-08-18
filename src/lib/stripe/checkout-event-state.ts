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
