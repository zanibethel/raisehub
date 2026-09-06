import { NextResponse } from 'next/server'

import { processBusinessNotifications } from '@/lib/notifications/business-notification-processor'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: 'Business notification cron is not configured.' },
      { status: 503 }
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const summary = await processBusinessNotifications()
    return NextResponse.json({ ok: true, summary })
  } catch (error) {
    console.error('Business notification cron failed', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown business notification processing error.',
      },
      { status: 500 }
    )
  }
}
