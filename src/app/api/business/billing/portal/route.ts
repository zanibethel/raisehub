import { NextResponse } from 'next/server'

import { getStripeClient } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUSINESS_PORTAL_FLOW = 'raisehub_business_growth_portal'

async function getOrCreateBusinessPortalConfiguration(
  stripe: ReturnType<typeof getStripeClient>,
  returnUrl: string
) {
  const configurations = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  })

  const existing = configurations.data.find(
    (configuration) =>
      configuration.metadata?.raisehub_flow === BUSINESS_PORTAL_FLOW
  )

  if (existing) return existing

  return stripe.billingPortal.configurations.create(
    {
      default_return_url: returnUrl,
      metadata: {
        raisehub_flow: BUSINESS_PORTAL_FLOW,
      },
      features: {
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          proration_behavior: 'none',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other',
            ],
          },
        },
      },
    },
    {
      idempotencyKey: 'raisehub-business-growth-portal-configuration-v1',
    }
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { businessId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const businessId =
    typeof body.businessId === 'string' ? body.businessId.trim() : ''

  if (!businessId) {
    return NextResponse.json({ error: 'Business is required.' }, { status: 400 })
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

  if (membership.membership_role !== 'owner') {
    return NextResponse.json(
      { error: 'Only the Business owner can manage paid billing.' },
      { status: 403 }
    )
  }

  if (membership.is_demo !== false || membership.demo_group !== null) {
    return NextResponse.json(
      { error: 'Demo businesses do not have Stripe billing.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient() as any
  const { data: billingAccount, error: billingError } = await admin
    .from('business_billing_accounts')
    .select('stripe_customer_id')
    .eq('business_id', businessId)
    .maybeSingle()

  if (billingError || !billingAccount?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No Stripe billing account exists for this business yet.' },
      { status: 404 }
    )
  }

  const returnUrl = new URL(
    `/upgrade?business=${encodeURIComponent(businessId)}`,
    new URL(request.url).origin
  ).toString()

  try {
    const stripe = getStripeClient()
    const configuration = await getOrCreateBusinessPortalConfiguration(
      stripe,
      returnUrl
    )
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billingAccount.stripe_customer_id,
      configuration: configuration.id,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Business Stripe billing portal creation failed', error)
    return NextResponse.json(
      {
        error:
          'Billing management is temporarily unavailable. Please try again in a few minutes.',
      },
      { status: 503 }
    )
  }
}
