import Link from 'next/link'
import type { ReactNode } from 'react'

export default function OwnerSupportLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F0F6FF]">
      <nav className="border-b border-blue-100 bg-blue-950 px-4 py-3 text-white sm:px-8" aria-label="Owner support sections">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-sm font-black">RaiseHub Support Center</p>
          <div className="flex items-center gap-2 text-xs font-bold sm:text-sm">
            <Link href="/dashboard/owner/support" className="rounded-lg px-3 py-2 hover:bg-white/10">
              Workspaces
            </Link>
            <Link href="/dashboard/owner/support/requests" className="rounded-lg bg-white px-3 py-2 text-blue-950">
              Requests
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
