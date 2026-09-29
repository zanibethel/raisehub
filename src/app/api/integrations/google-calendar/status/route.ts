import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const businessId = url.searchParams.get('businessId')?.trim() || ''
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ error: 'Choose a valid business.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const admin = createAdminClient() as any
  const [{ data: membership }, { data: profile }] = await Promise.all([
    admin.from('business_memberships').select('id').eq('business_id', businessId).eq('user_id', user.id).eq('status', 'active').in('membership_role', ['owner', 'manager']).maybeSingle(),
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])
  if (!membership && profile?.role !== 'owner') {
    return NextResponse.json({ error: 'You do not have access to this business.' }, { status: 403 })
  }

  const { data: connection } = await admin
    .from('business_calendar_connections')
    .select('provider_account_email,calendar_id,calendar_time_zone,connection_status,last_sync_at,last_error,updated_at')
    .eq('business_id', businessId)
    .eq('provider', 'google')
    .maybeSingle()

  return NextResponse.json({
    connected: connection?.connection_status === 'connected',
    connection: connection ?? null,
  })
}
