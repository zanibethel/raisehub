import { NextResponse } from 'next/server'

import { finalizeEndedPartnerRewardsQuarterReports } from '@/lib/services/partner-rewards-quarter-finalization-service'
import { getOwnerPartnerRewardsQuarterReport } from '@/lib/services/partner-rewards-quarter-report-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: 'Partner Rewards report cron is not configured.' }, { status: 503 })
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const finalization = await finalizeEndedPartnerRewardsQuarterReports()
    const result = await getOwnerPartnerRewardsQuarterReport()

    return NextResponse.json({
      ok: result.status === 'success',
      finalization,
      result,
    })
  } catch (error) {
    console.error('Partner Rewards report cron failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown quarterly report refresh error.' },
      { status: 500 }
    )
  }
}
