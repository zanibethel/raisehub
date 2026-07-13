export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotificationHistoryClient from './notification-history-client'

// =========================================
// 🔔 NOTIFICATION HISTORY PAGE
// Shows all of the signed-in user's notifications:
// active, read, and dismissed. Newest first.
// Authenticated users only — redirects to login otherwise.
// =========================================

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard/notifications')
  }

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select(
      'id, type, severity, title, message, action_url, action_label, created_at, read_at, dismissed_at, expires_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

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
            Could not load notifications. Please try again.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-green-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="text-sm font-medium text-blue-600">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          All Notifications
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your complete notification history.
        </p>

        <div className="mt-6">
          <NotificationHistoryClient initialNotifications={notifications ?? []} />
        </div>
      </div>
    </main>
  )
}
