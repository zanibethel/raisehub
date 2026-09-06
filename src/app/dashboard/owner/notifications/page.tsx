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
  role: string
  full_name: string | null
  business_name: string | null
  display_name: string | null
  is_demo: boolean | null
}

type BusinessMembershipRow = {
  user_id: string
}

type OrganizationMembershipRow = {
  user_id: string
}

type AccessTag = 'supporter' | 'business' | 'organization' | 'owner'

function getRecipientName(recipient: RecipientRow) {
  return (
    recipient.display_name?.trim() ||
    recipient.full_name?.trim() ||
    recipient.business_name?.trim() ||
    recipient.email?.trim() ||
    'Unnamed account'
  )
}

function getAccessTags({
  recipient,
  businessUserIds,
  organizationUserIds,
}: {
  recipient: RecipientRow
  businessUserIds: Set<string>
  organizationUserIds: Set<string>
}): AccessTag[] {
  const tags: AccessTag[] = ['supporter']

  if (recipient.role === 'business' || businessUserIds.has(recipient.id)) {
    tags.push('business')
  }

  if (
    recipient.role === 'organization' ||
    organizationUserIds.has(recipient.id)
  ) {
    tags.push('organization')
  }

  if (recipient.role === 'owner') {
    tags.push('owner')
  }

  return tags
}

export default async function OwnerNotificationsPage() {
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

  const admin = createAdminClient() as any
  const [profilesResult, businessMembershipsResult, organizationMembershipsResult] =
    await Promise.all([
      admin
        .from('profiles')
        .select(
          'id, email, role, full_name, business_name, display_name, is_demo'
        )
        .order('created_at', { ascending: false }),
      admin
        .from('business_memberships')
        .select('user_id')
        .eq('status', 'active'),
      admin
        .from('organization_memberships')
        .select('user_id')
        .eq('status', 'active'),
    ])

  const error =
    profilesResult.error ||
    businessMembershipsResult.error ||
    organizationMembershipsResult.error

  const businessUserIds = new Set(
    ((businessMembershipsResult.data ?? []) as BusinessMembershipRow[]).map(
      (membership) => membership.user_id
    )
  )

  const organizationUserIds = new Set(
    ((organizationMembershipsResult.data ?? []) as OrganizationMembershipRow[]).map(
      (membership) => membership.user_id
    )
  )

  const recipients = ((profilesResult.data ?? []) as RecipientRow[])
    .filter((recipient) => Boolean(recipient.email?.trim()))
    .map((recipient) => ({
      id: recipient.id,
      name: getRecipientName(recipient),
      email: recipient.email,
      accessTags: getAccessTags({
        recipient,
        businessUserIds,
        organizationUserIds,
      }),
      isDemo: recipient.is_demo === true,
    }))
    .sort((first, second) => first.name.localeCompare(second.name))

  return (
    <OwnerWorkspaceShell view="manage" detail="Notifications">
      <div className="mt-8 space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Owner communications
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Notification Center
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Select a RaiseHub account and send an in-app notification with an optional email copy. Each account card shows every experience available to that email, including Supporter, Business, Organization, and Owner access.
          </p>
        </header>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-900">
            Accounts could not be loaded: {error.message}
          </div>
        ) : (
          <OwnerNotificationTool recipients={recipients} />
        )}
      </div>
    </OwnerWorkspaceShell>
  )
}
