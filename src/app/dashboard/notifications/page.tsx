export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import NotificationHistoryClient from './notification-history-client'
import SpotlightHistory, { type SpotlightHistoryItem } from './spotlight-history'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard/notifications')
  }

  const admin = createAdminClient() as any

  const [notificationsResult, spotlightInteractionsResult] = await Promise.all([
    supabase
      .from('notifications')
      .select(
        'id, type, severity, title, message, action_url, action_label, created_at, read_at, dismissed_at, expires_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    admin
      .from('spotlight_interactions')
      .select(
        `id, view_count, first_viewed_at, last_viewed_at, dismissed_at, clicked_at,
         spotlight_campaigns!inner(id, title, body, kind, cta_label, cta_url, ends_at)`
      )
      .eq('user_id', user.id)
      .gt('view_count', 0)
      .order('last_viewed_at', { ascending: false }),
  ])

  const error = notificationsResult.error || spotlightInteractionsResult.error

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-green-50 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard" className="text-sm font-medium text-blue-600">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Notifications
          </h1>
          <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            Could not load your notification history. Please try again.
          </p>
        </div>
      </main>
    )
  }

  const spotlightHistory = ((spotlightInteractionsResult.data ?? []) as any[])
    .map((interaction): SpotlightHistoryItem | null => {
      const campaign = Array.isArray(interaction.spotlight_campaigns)
        ? interaction.spotlight_campaigns[0]
        : interaction.spotlight_campaigns

      if (!campaign) return null

      return {
        id: interaction.id,
        title: campaign.title,
        body: campaign.body ?? null,
        kind: campaign.kind,
        ctaLabel: campaign.cta_label ?? null,
        ctaUrl: campaign.cta_url ?? null,
        firstViewedAt: interaction.first_viewed_at ?? null,
        lastViewedAt: interaction.last_viewed_at ?? null,
        clickedAt: interaction.clicked_at ?? null,
        dismissedAt: interaction.dismissed_at ?? null,
        viewCount: Number(interaction.view_count ?? 0),
        endsAt: campaign.ends_at ?? null,
      }
    })
    .filter((item): item is SpotlightHistoryItem => Boolean(item))

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-green-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="text-sm font-medium text-blue-600">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Notifications & Spotlights
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your complete history of alerts, updates, announcements, and promotions.
        </p>

        <div className="mt-6">
          <SpotlightHistory items={spotlightHistory} />

          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Notifications
            </p>
            <NotificationHistoryClient
              initialNotifications={notificationsResult.data ?? []}
            />
          </section>
        </div>
      </div>
    </main>
  )
}
