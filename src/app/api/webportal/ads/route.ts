import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type WebPortalAdItem = {
  id: string
  kind: 'house' | 'paid'
  title: string
  message: string
  destinationUrl: string
  logoUrl?: string | null
}

const HOUSE_ADS: WebPortalAdItem[] = [
  {
    id: 'house-raisehub-business',
    kind: 'house',
    title: 'Small business owner?',
    message: 'Join RaiseHub and offer exclusive rewards to local supporters.',
    destinationUrl: 'https://raisehub.app/business',
  },
  {
    id: 'house-support-webportal',
    kind: 'house',
    title: 'Support WebPortal',
    message: 'Enjoying WebPortal? Help keep development and releases moving.',
    destinationUrl: 'https://raisehub.app/webportal/support',
  },
  {
    id: 'house-advertise-webportal',
    kind: 'house',
    title: 'Advertise on WebPortal',
    message: 'Put your business in this TV rotation with a scannable QR code.',
    destinationUrl: 'https://raisehub.app/webportal/advertise',
  },
]

export async function GET() {
  const now = new Date()
  const nowIso = now.toISOString()
  const admin = createAdminClient() as any

  const { data, error } = await admin
    .from('webportal_ad_orders')
    .select('id, business_name, ad_text, destination_url, logo_url, ends_at, activated_at')
    .eq('status', 'active')
    .order('activated_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('WebPortal ad rotation could not be loaded', error)
  }

  const paidAds: WebPortalAdItem[] = (data ?? [])
    .filter((row: any) => {
      if (!row.ends_at) return true
      const end = new Date(row.ends_at)
      return Number.isFinite(end.getTime()) && end > now
    })
    .map((row: any) => ({
      id: String(row.id),
      kind: 'paid' as const,
      title: String(row.business_name ?? 'Sponsored'),
      message: String(row.ad_text ?? ''),
      destinationUrl: String(row.destination_url ?? ''),
      logoUrl:
        typeof row.logo_url === 'string' && /^https?:\/\//i.test(row.logo_url)
          ? row.logo_url
          : null,
    }))
    .filter((item: WebPortalAdItem) => item.message && /^https?:\/\//i.test(item.destinationUrl))

  return NextResponse.json(
    {
      generatedAt: nowIso,
      rotationSeconds: 12,
      items: [...HOUSE_ADS, ...paidAds],
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
