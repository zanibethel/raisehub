import Link from 'next/link'
import { redirect } from 'next/navigation'

import EventPromotionSettingsEditor from '@/components/dashboards/owner/event-promotion-settings-editor'
import OwnerWorkspaceShell from '@/components/dashboards/owner/owner-workspace-shell'
import { getEventPromotionOwnerOverview } from '@/lib/services/event-promotion-settings-service'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Event Promotions | RaiseHub Owner Console',
}

function formatDate(value: string | null) {
  if (!value) return 'Not updated yet'
  return new Date(value).toLocaleString()
}

export default async function OwnerEventPromotionsPage() {
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

  const overview = await getEventPromotionOwnerOverview()

  return (
    <OwnerWorkspaceShell view="manage" detail="Event promotions">
      <div className="mt-8 space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">
                Promotion controls
              </p>
              <h1 className="mt-2 text-3xl font-black">
                Event Promotions
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Manage paid boost pricing, Partner Point redemption, and the
                supporter-facing placements included with an Event Promotion.
              </p>
            </div>

            <Link
              href="/dashboard/owner/spotlights"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white hover:bg-white/15"
            >
              Open Spotlights
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                Active promotions
              </p>
              <p className="mt-1 text-2xl font-black">
                {overview.activePromotionCount}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                Active event Spotlights
              </p>
              <p className="mt-1 text-2xl font-black">
                {overview.activeSpotlightCount}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                Last settings update
              </p>
              <p className="mt-1 text-sm font-black">
                {formatDate(overview.settings.updatedAt)}
              </p>
            </div>
          </div>
        </header>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          The default launch pricing is <strong>$2.99 / 3 days</strong>,{' '}
          <strong>$4.99 / 7 days</strong>, and{' '}
          <strong>$7.99 / 14 days</strong>. The 7-day option is the default.
          You can change or pause any of those here without a code deployment.
        </div>

        <EventPromotionSettingsEditor overview={overview} />
      </div>
    </OwnerWorkspaceShell>
  )
}
