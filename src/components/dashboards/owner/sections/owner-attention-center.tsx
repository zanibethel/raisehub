import Link from 'next/link'

import { getOwnerOperationalHealth } from '@/lib/repositories/owner-operational-health-repository'
import { createClient } from '@/lib/supabase/server'

type AttentionItem = {
  title: string
  description: string
  href: string
  count?: number | null
  tone: 'rose' | 'amber' | 'blue'
}

const toneClasses = {
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
}

export default async function OwnerAttentionCenter() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ count: openSupportCount, error: supportError }, profileResult] =
    await Promise.all([
      supabase
        .from('support_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']),
      user
        ? supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle<{ role: string }>()
        : Promise.resolve({ data: null, error: null }),
    ])

  const health =
    profileResult.data?.role === 'owner'
      ? await getOwnerOperationalHealth()
      : null
  const operationalCount = health
    ? health.failedWebhooks24h +
      health.staleProcessingWebhooks +
      health.failedCheckouts24h +
      health.failedPayouts24h
    : null

  const items: AttentionItem[] = [
    {
      title: 'Support requests',
      description: supportError
        ? 'Open the queue to review incoming customer messages.'
        : openSupportCount
          ? 'Customer messages are waiting for review or follow-up.'
          : 'No open customer messages need attention.',
      href: '/dashboard/owner/support/requests',
      count: supportError ? null : openSupportCount,
      tone: openSupportCount ? 'rose' : 'blue',
    },
    {
      title: 'Campaign review queue',
      description: 'Review pending campaigns, payout readiness, and risk context.',
      href: '/dashboard/owner/campaign-reviews',
      tone: 'amber',
    },
    {
      title: 'Platform health',
      description: health
        ? operationalCount
          ? 'Payment or operational signals need Owner review.'
          : health.errors.length
            ? 'Health monitoring is degraded and needs investigation.'
            : 'Payments and operational monitors are currently clear.'
        : 'Review operational warnings, payment health, and configuration status.',
      href: '/dashboard/owner/health',
      count: health ? operationalCount : null,
      tone:
        health && (operationalCount || health.errors.length > 0)
          ? 'rose'
          : 'blue',
    },
  ]

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Attention Center</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">What needs action now?</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Only operational destinations that may require an Owner decision or follow-up.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={`flex min-w-0 items-start justify-between gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${toneClasses[item.tone]}`}
          >
            <div className="min-w-0">
              <h3 className="font-black">{item.title}</h3>
              <p className="mt-1 text-sm leading-5 opacity-80">{item.description}</p>
            </div>
            {typeof item.count === 'number' ? (
              <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-white px-2 text-sm font-black shadow-sm">
                {item.count}
              </span>
            ) : (
              <span aria-hidden="true" className="shrink-0 text-xl font-black">→</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
