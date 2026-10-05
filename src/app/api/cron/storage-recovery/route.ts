import { NextResponse } from 'next/server'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SOURCE_BUCKETS = ['logos', 'business-sites'] as const
const ARCHIVE_BUCKET = 'recovery-archive'
const PAGE_SIZE = 100

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  return Boolean(cronSecret) && request.headers.get('authorization') === `Bearer ${cronSecret}`
}

async function listAllObjects(
  supabase: SupabaseClient<any, any, any>,
  bucket: (typeof SOURCE_BUCKETS)[number],
) {
  const files: Array<{ name: string; updated_at?: string | null }> = []

  async function walk(prefix = ''): Promise<void> {
    let offset = 0
    for (;;) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (error) throw error
      if (!data?.length) break

      for (const item of data) {
        if (!item.name) continue
        const path = prefix ? `${prefix}/${item.name}` : item.name
        if (item.id === null) await walk(path)
        else files.push({ name: path, updated_at: item.updated_at })
      }

      if (data.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }
  }

  await walk()
  return files
}

async function archiveExists(
  supabase: SupabaseClient<any, any, any>,
  archivePath: string,
) {
  const slash = archivePath.lastIndexOf('/')
  const folder = slash >= 0 ? archivePath.slice(0, slash) : ''
  const fileName = slash >= 0 ? archivePath.slice(slash + 1) : archivePath

  const { data, error } = await supabase.storage.from(ARCHIVE_BUCKET).list(folder, {
    limit: 100,
    search: fileName,
  })
  if (error) throw error
  return Boolean(data?.some((item) => item.name === fileName))
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: 'Storage recovery cron is not configured.' }, { status: 503 })
  }
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Storage recovery credentials are not configured.' }, { status: 503 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const jobName = 'storage-recovery'
  const startedAt = new Date().toISOString()
  await supabase.from('operational_job_health').upsert({
    job_name: jobName,
    last_started_at: startedAt,
    last_status: 'running',
    last_error: null,
    updated_at: startedAt,
  })

  let copied = 0
  let skipped = 0
  const failures: Array<{ bucket: string; path: string; error: string }> = []

  for (const bucket of SOURCE_BUCKETS) {
    let objects: Awaited<ReturnType<typeof listAllObjects>>
    try {
      objects = await listAllObjects(supabase, bucket)
    } catch (error) {
      failures.push({
        bucket,
        path: '*',
        error: error instanceof Error ? error.message : 'Unable to list source bucket.',
      })
      continue
    }

    for (const object of objects) {
      const stamp = new Date(object.updated_at ?? Date.now()).toISOString().replaceAll(':', '-')
      const archivePath = `${bucket}/${stamp}/${object.name}`

      try {
        if (await archiveExists(supabase, archivePath)) {
          skipped += 1
          continue
        }

        const { data: sourceFile, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(object.name)
        if (downloadError) throw downloadError

        const { error: uploadError } = await supabase.storage
          .from(ARCHIVE_BUCKET)
          .upload(archivePath, sourceFile, {
            upsert: false,
            contentType: sourceFile.type || undefined,
          })
        if (uploadError) throw uploadError

        copied += 1
      } catch (error) {
        failures.push({
          bucket,
          path: object.name,
          error: error instanceof Error ? error.message : 'Unknown archive failure.',
        })
      }
    }
  }

  if (failures.length) {
    console.error('Storage recovery archive had failures', failures)
    const failedAt = new Date().toISOString()
    await supabase.from('operational_job_health').upsert({
      job_name: jobName,
      last_failed_at: failedAt,
      last_status: 'failed',
      last_error: failures.slice(0, 10).map((failure) => `${failure.bucket}:${failure.path}: ${failure.error}`).join('\n'),
      metadata: { copied, skipped, failureCount: failures.length },
      updated_at: failedAt,
    })
    return NextResponse.json({ ok: false, copied, skipped, failures }, { status: 500 })
  }

  const succeededAt = new Date().toISOString()
  await supabase.from('operational_job_health').upsert({
    job_name: jobName,
    last_succeeded_at: succeededAt,
    last_status: 'succeeded',
    last_error: null,
    metadata: { copied, skipped },
    updated_at: succeededAt,
  })

  return NextResponse.json({ ok: true, copied, skipped })
}
