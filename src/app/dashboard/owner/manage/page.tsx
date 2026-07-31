import Link from 'next/link'
import { redirect } from 'next/navigation'

import OwnerWorkspaceShell from '@/components/dashboards/owner/owner-workspace-shell'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Manage Platform | RaiseHub Owner Console',
}

const groups = [
  {
    title: 'Accounts and workspaces',
    description: 'Find and manage the people and teams using RaiseHub.',
    items: [
      { label: 'Businesses', href: '/dashboard/owner/businesses', detail: 'Profiles, offers, visibility, redemptions, and assistance.' },
      { label: 'Organizations', href: '/dashboard/owner/organizations', detail: 'Campaigns, sellers, supporters, fundraising, and earnings.' },
      { label: 'Customers', href: '/dashboard/owner/customers', detail: 'Passes, purchases, savings, and redemption activity.' },
      { label: 'Find account', href: '/dashboard/owner/support', detail: 'Search every workspace and inspect account context.' },
    ],
  },
  {
    title: 'Trust and operations',
    description: 'Review activity that affects platform trust, revenue, or readiness.',
    items: [
      { label: 'Campaign reviews', href: '/dashboard/owner/campaign-reviews', detail: 'Review pending campaigns, payout readiness, and risk context.' },
      { label: 'Platform health', href: '/dashboard/owner/health', detail: 'Review warnings, operational health, and platform controls.' },
      { label: 'Analytics', href: '/dashboard/owner/analytics', detail: 'Open live platform totals and performance reporting.' },
    ],
  },
  {
    title: 'Platform configuration',
    description: 'Manage shared rules without duplicating operational workspaces.',
    items: [
      { label: 'Pricing', href: '/dashboard/owner/pricing', detail: 'Defaults, overrides, scheduled changes, and pricing history.' },
      { label: 'Preview role', href: '/dashboard/owner/preview', detail: 'Test another user experience without changing account ownership.' },
    ],
  },
]

export default async function OwnerManagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') redirect('/dashboard')

  return (
    <OwnerWorkspaceShell view="manage" detail="Platform management">
      <div className="mt-8 space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Manage</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Manage the platform</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Existing owner tools are organized here by purpose. Useful destinations remain available; repeated dashboard shortcuts are consolidated into this workspace.
          </p>
        </header>

        {groups.map((group) => (
          <section key={group.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-slate-950">{group.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{group.description}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {group.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-950">{item.label}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{item.detail}</p>
                  </div>
                  <span aria-hidden="true" className="shrink-0 text-xl font-bold text-slate-500">→</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </OwnerWorkspaceShell>
  )
}
