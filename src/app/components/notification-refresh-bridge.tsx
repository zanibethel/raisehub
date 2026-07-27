'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

type NotificationToast = {
  title: string
  message: string | null
}

export default function NotificationRefreshBridge({ userId }: { userId: string }) {
  const router = useRouter()
  const [toast, setToast] = useState<NotificationToast | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel(`nav-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as {
            title?: string | null
            message?: string | null
          }

          setToast({
            title: notification.title?.trim() || 'New notification',
            message: notification.message?.trim() || null,
          })
          router.refresh()

          if (hideTimer) clearTimeout(hideTimer)
          hideTimer = setTimeout(() => setToast(null), 6000)
        }
      )
      .subscribe()

    function refreshOnFocus() {
      router.refresh()
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)

    return () => {
      if (hideTimer) clearTimeout(hideTimer)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
      void supabase.removeChannel(channel)
    }
  }, [router, userId])

  if (!toast) return null

  return (
    <div
      role="status"
      className="fixed left-4 right-4 top-20 z-[120] rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl sm:left-auto sm:right-5 sm:w-96"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-950">{toast.title}</p>
          {toast.message ? (
            <p className="mt-1 line-clamp-3 text-sm leading-5 text-gray-600">{toast.message}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="Dismiss notification preview"
          className="shrink-0 rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
