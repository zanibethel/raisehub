import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { buildPublicRateLimitSubject } from '@/lib/security/request-identity'
import { consumeRateLimit } from '@/lib/security/rate-limit'
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
  'image/gif': 'gif',
}

function returnUrl(request: Request, status: 'success' | 'canceled') {
  const origin = new URL(request.url).origin
  return new URL(`/webportal/advertise?checkout=${status}`, origin).toString()
}

function hasExpectedImageSignature(type: string, bytes: Uint8Array) {
  if (type === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    )
  }

  if (type === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }

  if (type === 'image/webp') {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    )
  }

  if (type === 'image/gif') {
    if (bytes.length < 6) return false
    const header = String.fromCharCode(...bytes.slice(0, 6))
    return header === 'GIF87a' || header === 'GIF89a'
  }

  return false
}

export async function POST(request: Request) {
  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const planCode = formData.get('planCode')
  if (!isWebPortalAdPlanCode(planCode)) {
    return NextResponse.json(
      { error: 'Choose a valid advertising option.' },
      { status: 400 }
    )
  }

  const plan = WEBPORTAL_AD_PLANS[planCode]
  const businessName = cleanWebPortalText(formData.get('businessName'), 100)
  const contactEmail = cleanWebPortalText(formData.get('contactEmail'), 160)
  const adText = cleanWebPortalText(formData.get('adText'), 90)
  const destinationUrl = normalizeWebPortalDestinationUrl(
    formData.get('destinationUrl')
  )
  const logoValue = formData.get('logo')
  const logoFile =
    logoValue instanceof File && logoValue.size > 0 ? logoValue : null

  if (!businessName) {
    return NextResponse.json({ error: 'Enter your business name.' }, { status: 400 })
  }

  if (!contactEmail || !looksLikeEmail(contactEmail)) {
    return NextResponse.json({ error: 'Enter a valid contact email.' }, { status: 400 })
  }

  if (!adText) {
    return NextResponse.json({ error: 'Enter a short ad message.' }, { status: 400 })
  }

  if (!destinationUrl) {
    return NextResponse.json(
      { error: 'Enter a valid http or https destination for the QR code.' },
      { status: 400 }
    )
  }

  if (logoFile && !LOGO_EXTENSIONS[logoFile.type]) {
    return NextResponse.json(
      { error: 'Use a PNG, JPG, WebP, or GIF logo.' },
      { status: 400 }
    )
  }

  if (logoFile && logoFile.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: 'Logo must be 5 MB or smaller.' }, { status: 400 })
  }

  try {
    const decision = await consumeRateLimit({
      scope: 'webportal:advertise:checkout',
      subject: buildPublicRateLimitSubject({
        request,
        discriminator: contactEmail,
      }),
      limit: 5,
      windowSeconds: 30 * 60,
    })

    if (!decision.allowed) {
      return NextResponse.json(
        { error: 'Too many advertising checkout attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(decision.retryAfterSeconds, 1)),
          },
        }
      )
    }
  } catch (error) {
    console.error('Unable to confirm WebPortal advertising rate limit', error)
    return NextResponse.json(
      { error: 'Advertising checkout is temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  const admin = createAdminClient() as any
  let logoUrl: string | null = null
  let logoStoragePath: string | null = null

  if (logoFile) {
    const arrayBuffer = await logoFile.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    if (!hasExpectedImageSignature(logoFile.type, bytes)) {
      return NextResponse.json(
        { error: 'The uploaded logo does not match its declared image type.' },
        { status: 400 }
      )
    }

    logoStoragePath = `webportal-ads/${randomUUID()}.${LOGO_EXTENSIONS[logoFile.type]}`
    const { error: logoUploadError } = await admin.storage
      .from('logos')
      .upload(logoStoragePath, arrayBuffer, {
        contentType: logoFile.type,
        upsert: false,
      })

    if (logoUploadError) {
      console.error('WebPortal advertiser logo upload failed', logoUploadError)
      return NextResponse.json(
        { error: 'Your logo could not be uploaded. Try again or submit without a logo.' },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = admin.storage
      .from('logos')
      .getPublicUrl(logoStoragePath)

    logoUrl = publicUrlData.publicUrl
  }

  const createdAt = new Date().toISOString()
  const { data: order, error: insertError } = await admin
    .from('webportal_ad_orders')
    .insert({
      business_name: businessName,
      contact_email: contactEmail,
      ad_text: adText,
      destination_url: destinationUrl,
      logo_url: logoUrl,
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
    if (logoStoragePath) {
      await admin.storage.from('logos').remove([logoStoragePath])
    }
    console.error('WebPortal ad order could not be created', insertError)
    return NextResponse.json(
      { error: 'The ad order could not be created. Please try again.' },
      { status: 500 }
    )
  }

  try {
    const stripe = getStripeClient()
    const metadata = {
      raisehub_flow: WEBPORTAL_AD_FLOW,
      webportal_ad_order_id: String(order.id),
      webportal_ad_plan_code: plan.code,
      webportal_ad_amount_cents: String(plan.amountCents),
      webportal_ad_currency: 'usd',
      webportal_ad_mode: plan.recurring ? 'subscription' : 'payment',
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

    if (updateError) throw updateError

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

    if (logoStoragePath) {
      await admin.storage.from('logos').remove([logoStoragePath])
    }

    return NextResponse.json(
      { error: 'Secure checkout could not be started. Please try again.' },
      { status: 500 }
    )
  }
}
