import { NextResponse } from 'next/server'

import { createGoogleCalendarState, googleCalendarAuthorizationUrl } from '@/lib/calendar/google-oauth'
import { getSafeInternalPath } from '@/lib/navigation/safe-internal-path'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const businessId = url.searchParams.get('businessId')?.trim() || ''
  const returnTo = getSafeInternalPath(url.searchParams.get('returnTo'))

  if (!/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ error: 'Choose a valid business.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, url.origin))
  }

  const admin = createAdminClient() as any
  const [{ data: membership }, { data: profile }] = await Promise.all([
    admin.from('business_memberships').select('id').eq('business_id', businessId).eq('user_id', user.id).eq('status', 'active').in('membership_role', ['owner', 'manager']).maybeSingle(),
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])

  if (!membership && profile?.role !== 'owner') {
    return NextResponse.json({ error: 'You do not have access to this business.' }, { status: 403 })
  }

  const state = createGoogleCalendarState({ businessId, userId: user.id, returnTo })
  return NextResponse.redirect(googleCalendarAuthorizationUrl(url.origin, state))
}
