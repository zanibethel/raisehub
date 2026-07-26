import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function restoreCampaignSignupContext(
  nextPath: string,
  metadata: Record<string, unknown> | undefined
) {
  const selectedCampaignId =
    typeof metadata?.selected_campaign_id === 'string'
      ? metadata.selected_campaign_id.trim()
      : ''
  const sellerReferral =
    typeof metadata?.seller_referral === 'string'
      ? metadata.seller_referral.trim()
      : ''

  if (!selectedCampaignId || !sellerReferral) return nextPath

  const destination = new URL(nextPath, 'https://raisehub.local')
  const expectedPath = `/campaigns/${selectedCampaignId}`

  if (destination.pathname !== expectedPath || destination.searchParams.has('seller')) {
    return nextPath
  }

  destination.searchParams.set('seller', sellerReferral)
  return `${destination.pathname}${destination.search}${destination.hash}`
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  let next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    next = restoreCampaignSignupContext(
      next,
      data.user?.user_metadata as Record<string, unknown> | undefined
    )
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
