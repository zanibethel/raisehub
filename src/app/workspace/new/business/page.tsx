import { redirect } from 'next/navigation'

import CreateWorkspaceForm from '@/components/workspaces/create-workspace-form'
import { normalizeBusinessReferralToken } from '@/lib/referrals/business-referral'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  searchParams: Promise<{ ref?: string | string[] }>
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function NewBusinessWorkspacePage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const referralToken = normalizeBusinessReferralToken(firstParam(params.ref))
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const destination = referralToken
      ? `/signup/business?ref=${encodeURIComponent(referralToken)}`
      : '/signup/business'
    redirect(destination)
  }

  const { data: membership } = await supabase
    .from('business_memberships')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (membership?.business_id) {
    redirect(
      `/dashboard?workspace=${encodeURIComponent(
        `business:${membership.business_id}`
      )}`
    )
  }

  return (
    <CreateWorkspaceForm
      kind="business"
      referralToken={referralToken ?? undefined}
    />
  )
}
