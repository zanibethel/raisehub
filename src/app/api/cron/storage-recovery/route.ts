import { NextResponse } from 'next/server'

import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SOURCE_BUCKETS = ['logos', 'business-sites'] as const
const ARCHIVE_BUCKET = 'recovery-archive'

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  return Boolean(cronSecret) && request.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: 'Storage recovery cron is not configured.' }, { status: 503 })
  }
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()\n  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()\n  if (!supabaseUrl || !serviceRoleKey) {\n    return NextResponse.json({ error: 'Storage recovery credentials are not configured.' }, { status: 503 })\n  }\n  const supabase = createClient(supabaseUrl, serviceRoleKey, {\n    auth: { persistSession: false, autoRefreshToken: false },\n  })
  let copied = 0
  let skipped = 0
  const failures: Array<{ bucket: string; path: string; error: string }> = []

  for (const bucket of SOURCE_BUCKETS) {
    const { data: objects, error } = await supabase
      .schema('storage')
      .from('objects')
      .select('name,updated_at')
      .eq('bucket_id', bucket)
      .not('name', 'is', null)

    if (error) throw error

    for (const object of objects ?? []) {
      const name = object.name
      if (!name) continue
      const stamp = new Date(object.updated_at ?? Date.now()).toISOString().replaceAll(':', '-')
      const archivePath = `${bucket}/${stamp}/${name}`

      const { data: existing } = await supabase
        .schema('storage')
        .from('objects')
        .select('id')
        .eq('bucket_id', ARCHIVE_BUCKET)
        .eq('name', archivePath)
        .maybeSingle()

      if (existing) {
        skipped += 1
        continue
      }

      const { error: copyError } = await supabase.storage
        .from(bucket)
        .copy(name, archivePath, { destinationBucket: ARCHIVE_BUCKET })

      if (copyError) {
        failures.push({ bucket, path: name, error: copyError.message })
      } else {
        copied += 1
      }
    }
  }

  if (failures.length) {
    console.error('Storage recovery archive had copy failures', failures)
    return NextResponse.json({ ok: false, copied, skipped, failures }, { status: 500 })
  }

  return NextResponse.json({ ok: true, copied, skipped })
}
