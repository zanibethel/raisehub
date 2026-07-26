import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await (admin as any)
    .from('campaign_sellers')
    .select('id, display_name, referral_code')
    .eq('campaign_id', id)
    .eq('status', 'active')
    .order('display_name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { sellers: [], error: 'Seller options are temporarily unavailable.' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { sellers: data ?? [] },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
