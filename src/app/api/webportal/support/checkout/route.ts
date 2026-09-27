import { NextResponse } from 'next/server'

import {
  WEBPORTAL_SUPPORT_FLOW,
  cleanWebPortalText,
  looksLikeEmail,
  normalizeWebPortalSupportAmount,
} from '@/lib/webportal/commerce'
import { getStripeClient } from '@/lib/stripe/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function returnUrl(request: Request, status: 'success' | 'canceled') {
  const origin = new URL(request.url).origin
  return new URL(`/webportal/support?checkout=${status}`, origin).toString()
}

export async function POST(request: Request) {
  let body: { amount?: unknown; email?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const amountCents = normalizeWebPortalSupportAmount(body.amount)
  const email = cleanWebPortalText(body.email, 160)

  if (!amountCents) {
    return NextResponse.json(
      { error: 'Choose a support amount between $3 and $500.' },
      { status: 400 }
    )
  }

  if (email && !looksLikeEmail(email)) {
    return NextResponse.json(
      { error: 'Enter a valid email address or leave it blank.' },
      { status: 400 }
    )
  }

  try {
    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: returnUrl(request, 'success'),
      cancel_url: returnUrl(request, 'canceled'),
      customer_email: email || undefined,
      metadata: {
        raisehub_flow: WEBPORTAL_SUPPORT_FLOW,
        webportal_support_amount_cents: String(amountCents),
      },
      payment_intent_data: {
        metadata: {
          raisehub_flow: WEBPORTAL_SUPPORT_FLOW,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: 'Support WebPortal',
              description: 'Voluntary support for WebPortal development and operation',
            },
          },
        },
      ],
    })

    if (!session.url) {
      throw new Error('Stripe Checkout did not return a URL.')
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('WebPortal support checkout failed', error)
    return NextResponse.json(
      { error: 'Secure checkout could not be started. Please try again.' },
      { status: 500 }
    )
  }
}
