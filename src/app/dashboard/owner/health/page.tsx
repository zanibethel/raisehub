import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getOwnerOperationalHealth } from '@/lib/repositories/owner-operational-health-repository'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Platform Health | RaiseHub Owner Console',
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function metricTone(value: number) {
  return value > 0
    ? 'border-rose-200 bg-rose-50 text-rose-900'
    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
}

export default async function OwnerPlatformHealthPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') redirect('/dashboard')

  const health = await getOwnerOperationalHealth()
  const needsAttention =
    health.failedWebhooks24h > 0 ||
    health.staleProcessingWebhooks > 0 ||
    health.failedCheckouts24h > 0 ||
    health.failedPayouts24h > 0 ||
    health.errors.length > 0

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard?workspace=owner"
          className="text-sm font-bold text-blue-700 hover:text-blue-900"
        >
          ← Back to Owner Console
        </Link>

        <header className="mt-4 rounded-2xl bg-slate-950 px-5 py-5 text-white shadow-lg sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">
            Operations and security
          </p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">Platform health</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">
                Persistent signals from payments, checkout, payout delivery, and abuse controls.
                Raw service-role records stay server-side.
              </p>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                needsAttention
                  ? 'bg-rose-100 text-rose-900'
                  : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              {needsAttention ? 'Needs review' : 'Healthy'}
            </span>
          </div>
        </header>

        {health.errors.length > 0 ? (
          <section className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950">
            <h2 className="font-black">Monitoring query degraded</h2>
            <p className="mt-1 text-sm leading-6">
              One or more health checks could not be loaded. Treat the dashboard as incomplete until the query error is resolved.
            </p>
          </section>
        ) : null}

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Failed webhooks · 24h', health.failedWebhooks24h],
            ['Stale webhook processing', health.staleProcessingWebhooks],
            ['Failed checkouts · 24h', health.failedCheckouts24h],
            ['Failed payouts · 24h', health.failedPayouts24h],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className={`rounded-2xl border p-4 shadow-sm ${metricTone(Number(value))}`}
            >
              <p className="text-3xl font-black">{Number(value)}</p>
              <p className="mt-1 text-sm font-bold">{String(label)}</p>
            </div>
          ))}
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-slate-950">Recent webhook failures</h2>
                <p className="mt-1 text-sm text-slate-600">Newest persisted Stripe processing failures.</p>
              </div>
              <span className="text-xs font-bold text-slate-500">Latest 12</span>
            </div>

            <div className="mt-4 space-y-3">
              {health.recentWebhookFailures.length === 0 ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                  No persisted webhook failures.
                </p>
              ) : (
                health.recentWebhookFailures.map((event) => (
                  <article key={event.stripeEventId} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black text-slate-950">{event.eventType}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-700">
                        {event.livemode ? 'Stripe live' : 'Stripe test'}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-500">{event.stripeEventId}</p>
                    <p className="mt-2 text-sm leading-5 text-rose-900">
                      {event.lastError || 'No error message was recorded.'}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Attempts: {event.attemptCount} · {formatDateTime(event.updatedAt)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-slate-950">Recent payout failures</h2>
                <p className="mt-1 text-sm text-slate-600">Failed organization payouts requiring investigation.</p>
              </div>
              <span className="text-xs font-bold text-slate-500">Latest 12</span>
            </div>

            <div className="mt-4 space-y-3">
              {health.recentPayoutFailures.length === 0 ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                  No persisted payout failures.
                </p>
              ) : (
                health.recentPayoutFailures.map((event) => (
                  <article key={event.id} className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black text-slate-950">{event.failureCode || event.status}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-700">
                        {event.livemode ? 'Stripe live' : 'Stripe test'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-amber-950">
                      {event.failureMessage || 'No failure message was recorded.'}
                    </p>
                    <p className="mt-2 break-all text-xs text-slate-500">
                      {event.stripePayoutId || event.id} · {formatDateTime(event.updatedAt)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-950">Recent rate-limit pressure</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Highest active request buckets updated in the last 15 minutes. Subjects remain hashed and are never displayed.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {health.rateLimitPressure.length === 0 ? (
              <p className="text-sm text-slate-600">No recent rate-limit bucket activity.</p>
            ) : (
              health.rateLimitPressure.map((bucket, index) => (
                <div key={`${bucket.scope}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="truncate text-sm font-black text-slate-900">{bucket.scope}</p>
                  <p className="mt-1 text-2xl font-black text-blue-800">{bucket.requestCount}</p>
                  <p className="text-xs text-slate-500">requests in active bucket · {formatDateTime(bucket.updatedAt)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <p className="mt-4 text-xs text-slate-500">
          Snapshot generated {formatDateTime(health.generatedAt)}. This page intentionally excludes raw webhook payloads, customer emails, and rate-limit subject hashes.
        </p>
      </div>
    </main>
  )
}
