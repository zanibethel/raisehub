import { NextResponse, type NextRequest } from 'next/server'

import {
  BUSINESS_REFERRAL_COOKIE,
  BUSINESS_REFERRAL_COOKIE_MAX_AGE,
  getBusinessReferralCookieDomain,
  normalizeBusinessReferralToken,
} from '@/lib/referrals/business-referral'
import { createAdminClient } from '@/lib/supabase/admin'

type ReferralLandingRow = {
  id: string
  referral_token: string
  referred_business_id: string | null
  first_clicked_at: string | null
  click_count: number | null
}

async function findOpenReferral(token: string): Promise<ReferralLandingRow | null> {
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('partner_referrals')
    .select('id,referral_token,referred_business_id,first_clicked_at,click_count')
    .eq('referral_token', token)
    .is('referred_business_id', null)
    .maybeSingle()

  return (data ?? null) as ReferralLandingRow | null
}

export async function GET(request: NextRequest) {
  const requestedToken = normalizeBusinessReferralToken(
    request.nextUrl.searchParams.get('ref')
  )
  const redirectUrl = new URL('/signup/business', request.url)

  if (!requestedToken) return NextResponse.redirect(redirectUrl)

  const existingToken = normalizeBusinessReferralToken(
    request.cookies.get(BUSINESS_REFERRAL_COOKIE)?.value
  )

  // First valid, unclaimed referral wins. An invalid or already-claimed cookie
  // is replaced by the new valid referral instead of trapping attribution.
  let referral = existingToken ? await findOpenReferral(existingToken) : null
  if (!referral) referral = await findOpenReferral(requestedToken)
  if (!referral) return NextResponse.redirect(redirectUrl)

  const token = referral.referral_token
  const now = new Date().toISOString()
  const admin = createAdminClient() as any

  await admin
    .from('partner_referrals')
    .update({
      first_clicked_at: referral.first_clicked_at ?? now,
      last_clicked_at: now,
      click_count: Number(referral.click_count ?? 0) + 1,
    })
    .eq('id', referral.id)
    .is('referred_business_id', null)

  redirectUrl.searchParams.set('ref', token)
  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set(BUSINESS_REFERRAL_COOKIE, token, {
    path: '/',
    maxAge: BUSINESS_REFERRAL_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    httpOnly: false,
    domain: getBusinessReferralCookieDomain(request.nextUrl.hostname),
  })

  return response
}
