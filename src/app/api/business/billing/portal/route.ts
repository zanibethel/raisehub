import { NextResponse } from 'next/server'

import { getStripeClient } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    .select('business_id, status, is_demo, demo_group')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError || !membership) {
    return NextResponse.json({ error: 'Business access was not found.' }, { status: 403 })
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

  const stripe = getStripeClient()
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: billingAccount.stripe_customer_id,
    return_url: new URL(
      `/upgrade?business=${encodeURIComponent(businessId)}`,
      new URL(request.url).origin
    ).toString(),
  })

  return NextResponse.json({ url: portalSession.url })
}
