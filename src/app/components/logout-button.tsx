'use client'

import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:border-blue-600 hover:text-blue-600"
    >
      Log out
    </button>
  )
}