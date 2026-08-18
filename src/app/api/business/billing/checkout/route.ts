import { NextResponse } from 'next/server'

import {
  BUSINESS_BILLING_FLOW,
  BUSINESS_PLANS,
  isBusinessPlanCode,
} from '@/lib/stripe/business-billing'
import { getStripeClient } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeReturnUrl(request: Request, path: string) {
  const origin = new URL(request.url).origin
  return new URL(path, origin).toString()
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { businessId?: unknown; planCode?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const businessId =
    typeof body.businessId === 'string' ? body.businessId.trim() : ''
  const planCode = body.planCode

  if (!businessId || !isBusinessPlanCode(planCode)) {
    return NextResponse.json({ error: 'Choose a valid business and plan.' }, { status: 400 })
  }

  const { data: membership, error: membershipError } = await (supabase as any)
    .from('business_memberships')
    .select('business_id, membership_role, status, is_demo, demo_group')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError || !membership) {
    return NextResponse.json({ error: 'Business access was not found.' }, { status: 403 })
  }

  if (membership.is_demo !== false || membership.demo_group !== null) {
    return NextResponse.json(
      { error: 'Demo businesses cannot create Stripe subscriptions.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient() as any
  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('id, name, email, status, archived_at, is_demo, demo_group, subscription_tier')
    .eq('id', businessId)
    .maybeSingle()

  if (
    businessError ||
    !business ||
    business.is_demo !== false ||
    business.demo_group !== null ||
    business.status !== 'active' ||
    business.archived_at !== null
  ) {
    return NextResponse.json(
      { error: 'This business is not eligible for a production upgrade.' },
      { status: 400 }
    )
  }

  const { data: existingBilling } = await admin
    .from('business_billing_accounts')
    .select('stripe_customer_id, stripe_subscription_id, subscription_status')
    .eq('business_id', businessId)
    .maybeSingle()

  if (
    existingBilling?.stripe_subscription_id &&
    ['trialing', 'active', 'past_due'].includes(existingBilling.subscription_status)
  ) {
    return NextResponse.json(
      { error: 'This business already has an active Growth subscription. Manage billing instead.' },
      { status: 409 }
    )
  }

  const plan = BUSINESS_PLANS[planCode]
  const stripe = getStripeClient()

  let customerId = existingBilling?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create(
      {
        email: business.email || user.email || undefined,
        name: business.name,
        metadata: {
          raisehub_business_id: business.id,
        },
      },
      {
        idempotencyKey: `raisehub-business-customer-${business.id}`,
      }
    )
    customerId = customer.id

    const { error: billingUpsertError } = await admin
      .from('business_billing_accounts')
      .upsert(
        {
          business_id: business.id,
          stripe_customer_id: customer.id,
          livemode: false,
          plan_code: 'free',
          subscription_status: 'inactive',
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id' }
      )

    if (billingUpsertError) throw billingUpsertError
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      customer: customerId,
      success_url: safeReturnUrl(
        request,
        `/upgrade?business=${encodeURIComponent(business.id)}&checkout=success`
      ),
      cancel_url: safeReturnUrl(
        request,
        `/upgrade?business=${encodeURIComponent(business.id)}&checkout=canceled`
      ),
      allow_promotion_codes: true,
      client_reference_id: business.id,
      metadata: {
        raisehub_flow: BUSINESS_BILLING_FLOW,
        raisehub_business_id: business.id,
        raisehub_plan_code: planCode,
      },
      subscription_data: {
        metadata: {
          raisehub_flow: BUSINESS_BILLING_FLOW,
          raisehub_business_id: business.id,
          raisehub_plan_code: planCode,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: plan.amountCents,
            recurring: { interval: plan.interval },
            product_data: {
              name: plan.label,
              description: 'RaiseHub Growth business subscription',
            },
          },
        },
      ],
    },
    {
      idempotencyKey: `raisehub-business-upgrade-${business.id}-${planCode}-${Date.now()}`,
    }
  )

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe Checkout URL was not created.' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
