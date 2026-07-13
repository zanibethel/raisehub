'use server'

import { createClient } from '@/lib/supabase/server'

// =========================================
// 🔔 MARK NOTIFICATION AS READ
// Sets read_at to now for the given notification.
// Only the owning user may update their own notification.
// =========================================
export async function markNotificationReadAction(notificationId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .is('read_at', null)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

// =========================================
// 🔔 MARK ALL NOTIFICATIONS AS READ
// Sets read_at to now for all unread, non-dismissed
// notifications belonging to the current user.
// =========================================
export async function markAllNotificationsReadAction() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
    .is('dismissed_at', null)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

// =========================================
// 🔔 DISMISS NOTIFICATION
// Sets dismissed_at to now. Dismissed notifications
// no longer appear in the active bell list but
// remain available in the history page.
// =========================================
export async function dismissNotificationAction(notificationId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .is('dismissed_at', null)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
