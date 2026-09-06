import { redirect } from 'next/navigation'

import OwnerNotificationTool from '@/components/dashboards/owner/owner-notification-tool'
import OwnerWorkspaceShell from '@/components/dashboards/owner/owner-workspace-shell'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Notifications | RaiseHub Owner Console',
}

type RecipientRow = {
  id: string
  email: string | null
  role: 'business' | 'organization' | 'customer'
  full_name: string | null
  business_name: string | null
  display_name: string | null
  is_demo: boolean | null
}

function getRecipientName(recipient: RecipientRow) {
  return (
    recipient.business_name?.trim() ||
    recipient.display_name?.trim() ||
    recipient.full_name?.trim() ||
    recipient.email?.trim() ||
    'Unnamed profile'
  )
}

export default async function OwnerNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') redirect('/dashboard')

  const admin = createAdminClient() as any
  const { data: recipientRows, error } = await admin
    .from('profiles')
    .select('id, email, role, full_name, business_name, display_name, is_demo')
    .in('role', ['business', 'organization', 'customer'])
    .order('created_at', { ascending: false })

  const recipients = ((recipientRows ?? []) as RecipientRow[])
    .map((recipient) => ({
      id: recipient.id,
      name: getRecipientName(recipient),
      email: recipient.email,
      role: recipient.role,
      isDemo: recipient.is_demo === true,
    }))
    .sort((first, second) => first.name.localeCompare(second.name))

  return (
    <OwnerWorkspaceShell view="manage" detail="Notifications">
      <div className="mt-8 space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Owner communications</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Notification Center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Select specific business, organization, or customer profiles and send a RaiseHub notification with an optional email copy. Use reminder templates for common follow-up, or write a custom message.
          </p>
        </header>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-900">
            Profiles could not be loaded: {error.message}
          </div>
        ) : (
          <OwnerNotificationTool recipients={recipients} />
        )}
      </div>
    </OwnerWorkspaceShell>
  )
}
