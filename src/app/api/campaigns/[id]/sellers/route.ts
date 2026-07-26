import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params
  const organizationId = new URL(request.url).searchParams.get('organization')?.trim() || ''
  const admin = createAdminClient()
  let sellerCampaignId = id

  if (organizationId) {
    const { data: currentCampaign, error: currentCampaignError } = await (admin as any)
      .from('campaigns')
      .select('id, organization_id')
      .eq('id', id)
      .maybeSingle()

    if (currentCampaignError) {
      return NextResponse.json(
        { sellers: [], error: 'Seller options are temporarily unavailable.' },
        { status: 500 }
      )
    }

    if (currentCampaign?.organization_id !== organizationId) {
      const { data: replacementCampaign, error: replacementCampaignError } = await (admin as any)
        .from('campaigns')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (replacementCampaignError) {
        return NextResponse.json(
          { sellers: [], error: 'Seller options are temporarily unavailable.' },
          { status: 500 }
        )
      }

      if (!replacementCampaign) {
        return NextResponse.json(
          { sellers: [], campaignId: null },
          { headers: { 'Cache-Control': 'no-store' } }
        )
      }

      sellerCampaignId = replacementCampaign.id
    }
  }

  const { data, error } = await (admin as any)
    .from('campaign_sellers')
    .select('id, display_name, referral_code')
    .eq('campaign_id', sellerCampaignId)
    .eq('status', 'active')
    .order('display_name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { sellers: [], error: 'Seller options are temporarily unavailable.' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { sellers: data ?? [], campaignId: sellerCampaignId },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
