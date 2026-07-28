import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { businessId?: string }
  const businessId = body.businessId?.trim()

  if (!businessId) {
    return NextResponse.json({ error: 'Business workspace required.' }, { status: 400 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, legacy_profile_id, status')
    .eq('id', businessId)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ error: 'Business workspace not found.' }, { status: 404 })
  }

  const isLegacyOwner = business.legacy_profile_id === user.id
  const { data: membership } = await supabase
    .from('business_memberships')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('membership_role', ['owner', 'manager'])
    .maybeSingle()

  if (!isLegacyOwner && !membership) {
    return NextResponse.json({ error: 'Business management access required.' }, { status: 403 })
  }

  if (!['archived', 'restore_requested'].includes(business.status)) {
    return NextResponse.json(
      { error: 'Only archived businesses can request restoration.' },
      { status: 409 }
    )
  }

  const requestedAt = new Date().toISOString()
  const { error } = await supabase
    .from('businesses')
    .update({
      status: 'restore_requested',
      restore_requested_at: requestedAt,
      restore_requested_by: user.id,
    })
    .eq('id', businessId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'restore_requested', requestedAt })
}
