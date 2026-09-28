import { NextResponse } from 'next/server'

import { getStripeClient } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  WEBPORTAL_AD_FLOW,
  WEBPORTAL_AD_PLANS,
  cleanWebPortalText,
  isWebPortalAdPlanCode,
  looksLikeEmail,
  normalizeWebPortalDestinationUrl,
} from '@/lib/webportal/commerce'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LOGO_BYTES = 5 * 1024 * 1024
const LOGO_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

function returnUrl(request: Request, status: 'success' | 'canceled') {
  const origin = new URL(request.url).origin
  return new URL(`/webportal/advertise?checkout=${status}`, origin).toString()
}

export async function POST(request: Request) {
  let body: {
    planCode?: unknown
    businessName?: unknown
    contactEmail?: unknown
    adText?: unknown
    destinationUrl?: unknown
  } = {}
  let logoFile: File | null = null

  try {
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      body = {
        planCode: formData.get('planCode'),
        businessName: formData.get('businessName'),
        contactEmail: formData.get('contactEmail'),
        adText: formData.get('adText'),
        destinationUrl: formData.get('destinationUrl'),
      }

      const logo = formData.get('logo')
      if (logo instanceof File && logo.size > 0) {
        logoFile = logo
      }
    } else {
      body = await request.json()
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (logoFile) {
    if (!LOGO_EXTENSIONS[logoFile.type]) {
      return NextResponse.json(
        { error: 'Business logo must be a PNG, JPG, or WebP image.' },
        { status: 400 }
      )
    }

    if (logoFile.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: 'Business logo must be 5 MB or smaller.' },
        { status: 400 }
      )
    }
  }

  if (!isWebPortalAdPlanCode(body.planCode)) {
    return NextResponse.json(
      { error: 'Choose a valid advertising option.' },
      { status: 400 }
    )
  }

  const plan = WEBPORTAL_AD_PLANS[body.planCode]
  const businessName = cleanWebPortalText(body.businessName, 100)
  const contactEmail = cleanWebPortalText(body.contactEmail, 160)
  const adText = cleanWebPortalText(body.adText, 90)
  const destinationUrl = normalizeWebPortalDestinationUrl(body.destinationUrl)

  if (!businessName) {
    return NextResponse.json(
      { error: 'Enter your business name.' },
      { status: 400 }
    )
  }

  if (!contactEmail || !looksLikeEmail(contactEmail)) {
    return NextResponse.json(
      { error: 'Enter a valid contact email.' },
      { status: 400 }
    )
  }

  if (!adText) {
    return NextResponse.json(
      { error: 'Enter a short ad message.' },
      { status: 400 }
    )
  }

  if (!destinationUrl) {
    return NextResponse.json(
      { error: 'Enter a valid http or https destination for the QR code.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient() as any
  const createdAt = new Date().toISOString()
  const { data: order, error: insertError } = await admin
    .from('webportal_ad_orders')
    .insert({
      business_name: businessName,
      contact_email: contactEmail,
      ad_text: adText,
      destination_url: destinationUrl,
      plan_code: plan.code,
      amount_cents: plan.amountCents,
      duration_days: plan.durationDays,
      recurring: plan.recurring,
      status: 'checkout_open',
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select('id')
    .single()

  if (insertError || !order?.id) {
    console.error('WebPortal ad order could not be created', insertError)
    return NextResponse.json(
      { error: 'The ad order could not be created. Please try again.' },
      { status: 500 }
    )
  }

  if (logoFile) {
    try {
      const extension = LOGO_EXTENSIONS[logoFile.type]
      const logoPath = `webportal-ads/${order.id}-${Date.now()}.${extension}`
      const bytes = await logoFile.arrayBuffer()

      const { error: uploadError } = await admin.storage
        .from('logos')
        .upload(logoPath, bytes, {
          contentType: logoFile.type,
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = admin.storage
        .from('logos')
        .getPublicUrl(logoPath)

      const { error: logoUpdateError } = await admin
        .from('webportal_ad_orders')
        .update({
          logo_url: publicUrlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (logoUpdateError) throw logoUpdateError
    } catch (error) {
      console.error('WebPortal advertiser logo upload failed', error)

      await admin
        .from('webportal_ad_orders')
        .update({
          status: 'checkout_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      return NextResponse.json(
        { error: 'The business logo could not be saved. Please try again.' },
        { status: 500 }
      )
    }
  }

  try {
    const stripe = getStripeClient()
    const metadata = {
      raisehub_flow: WEBPORTAL_AD_FLOW,
      webportal_ad_order_id: String(order.id),
      webportal_ad_plan_code: plan.code,
    }

    const session = await stripe.checkout.sessions.create({
      mode: plan.recurring ? 'subscription' : 'payment',
      success_url: returnUrl(request, 'success'),
      cancel_url: returnUrl(request, 'canceled'),
      customer_email: contactEmail,
      client_reference_id: String(order.id),
      metadata,
      ...(plan.recurring
        ? {
            subscription_data: {
              metadata,
            },
          }
        : {
            payment_intent_data: {
              metadata,
            },
          }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: plan.amountCents,
            ...(plan.recurring
              ? {
                  recurring: {
                    interval: 'month' as const,
                  },
                }
              : {}),
            product_data: {
              name: `WebPortal advertising — ${plan.label}`,
              description: plan.recurring
                ? 'Recurring WebPortal advertising placement, subject to approval'
                : `WebPortal advertising placement for ${plan.durationDays} days after approval`,
            },
          },
        },
      ],
    })

    if (!session.url) {
      throw new Error('Stripe Checkout did not return a URL.')
    }

    const { error: updateError } = await admin
      .from('webportal_ad_orders')
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('WebPortal advertising checkout failed', error)

    await admin
      .from('webportal_ad_orders')
      .update({
        status: 'checkout_failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', 'checkout_open')

    return NextResponse.json(
      { error: 'Secure checkout could not be started. Please try again.' },
      { status: 500 }
    )
  }
}
