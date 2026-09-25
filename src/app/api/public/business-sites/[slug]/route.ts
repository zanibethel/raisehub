import { NextResponse } from 'next/server'

import { getActiveDataEnvironment, recordMatchesEnvironment } from '@/lib/data-environment'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ slug: string }>
}

function benefitHidesRaiseHubBranding(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const snapshot = value as Record<string, unknown>
  const config = snapshot.benefit_config
  if (!config || typeof config !== 'object' || Array.isArray(config)) return false
  return (config as Record<string, unknown>).hide_raisehub_branding === true
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params
  const normalizedSlug = slug.trim().toLowerCase()

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    return NextResponse.json({ error: 'Invalid site address.' }, { status: 400 })
  }

  const admin = createAdminClient() as any
  const environment = getActiveDataEnvironment()

  const { data: site, error: siteError } = await admin
    .from('business_sites')
    .select('business_id,slug,site_title,hero_heading,hero_copy,about_heading,about_copy,phone,address,contact_email,accent_color,secondary_color,background_color,text_color,show_offers,is_published,section_order,logo_url,hero_image_url,hours_copy,facebook_url,instagram_url,tiktok_url,enabled_modules,menu_config,location_config,booking_config')
    .eq('slug', normalizedSlug)
    .eq('is_published', true)
    .maybeSingle()

  if (siteError) {
    console.error('Public business site lookup failed', { slug: normalizedSlug, message: siteError.message })
    return NextResponse.json({ error: 'Business site unavailable.' }, { status: 500 })
  }

  if (!site) {
    return NextResponse.json({ error: 'Business site not published.' }, { status: 404 })
  }

  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('id,legacy_profile_id,is_demo,demo_group,status,archived_at')
    .eq('id', site.business_id)
    .maybeSingle()

  if (businessError) {
    console.error('Public business site business lookup failed', {
      slug: normalizedSlug,
      businessId: site.business_id,
      message: businessError.message,
    })
    return NextResponse.json({ error: 'Business site unavailable.' }, { status: 500 })
  }

  if (
    !business ||
    business.status !== 'active' ||
    business.archived_at ||
    !recordMatchesEnvironment(business, environment)
  ) {
    return NextResponse.json({ error: 'Business site not published.' }, { status: 404 })
  }

  const now = new Date().toISOString()
  let offers: Array<{ id: string; title: string; description: string | null; benefit: string | null }> = []

  if (site.show_offers) {
    const offerBusinessId = business.legacy_profile_id ?? business.id

    let offerQuery = admin
      .from('offers')
      .select('id,title,description,discount')
      .eq('business_id', offerBusinessId)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(6)

    if (environment.mode === 'production') {
      offerQuery = offerQuery.eq('is_demo', false).is('demo_group', null)
    } else {
      offerQuery = offerQuery.eq('is_demo', true).eq('demo_group', environment.demoGroup)
    }

    const { data: offerRows, error: offerError } = await offerQuery

    if (offerError) {
      console.error('Public business site offer lookup failed', {
        slug: normalizedSlug,
        businessId: business.id,
        offerBusinessId,
        message: offerError.message,
      })
      return NextResponse.json({ error: 'Business site offers unavailable.' }, { status: 500 })
    }

    offers = (offerRows ?? []).map((offer: any) => ({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      benefit: offer.discount ?? null,
    }))
  }

  const { data: activeWebsiteRedemptions, error: redemptionError } = await admin
    .from('partner_reward_redemptions')
    .select('benefit_snapshot,ends_at')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .or(`ends_at.is.null,ends_at.gt.${now}`)

  if (redemptionError) {
    console.error('Public business site reward lookup failed', {
      slug: normalizedSlug,
      businessId: business.id,
      message: redemptionError.message,
    })
  }

  const hideRaiseHubBranding = (activeWebsiteRedemptions ?? []).some((redemption: any) =>
    benefitHidesRaiseHubBranding(redemption.benefit_snapshot)
  )

  return NextResponse.json({
    site,
    offers,
    websiteBenefits: {
      hideRaiseHubBranding,
    },
  })
}