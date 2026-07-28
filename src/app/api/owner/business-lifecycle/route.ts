import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireOwner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: string }>()

  return profile?.role === 'owner' ? profile : null
}

export async function PATCH(request: Request) {
  const owner = await requireOwner()

  if (!owner) {
    return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    businessId?: string
    action?: 'archive' | 'restore' | 'keep_archived'
    reason?: string
    note?: string
  }

  const businessId = body.businessId?.trim()
  if (!businessId || !body.action) {
    return NextResponse.json(
      { error: 'Business and action are required.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient() as any
  const now = new Date().toISOString()

  const { data: existingBusiness, error: lookupError } = await admin
    .from('businesses')
    .select('id, legacy_profile_id')
    .eq('id', businessId)
    .maybeSingle()

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 })
  }

  if (!existingBusiness) {
    return NextResponse.json(
      { error: 'Business workspace not found.' },
      { status: 404 }
    )
  }

  const values =
    body.action === 'restore'
      ? {
          status: 'active',
          archived_at: null,
          archive_reason: null,
          archived_by: null,
          restore_requested_at: null,
          restore_requested_by: null,
          lifecycle_note: body.note?.trim() || null,
          updated_at: now,
        }
      : body.action === 'keep_archived'
        ? {
            status: 'archived',
            restore_requested_at: null,
            restore_requested_by: null,
            lifecycle_note: body.note?.trim() || null,
            updated_at: now,
          }
        : {
            status: 'archived',
            archived_at: now,
            archive_reason:
              body.reason?.trim() || 'Archived by RaiseHub Owner',
            archived_by: owner.id,
            restore_requested_at: null,
            restore_requested_by: null,
            lifecycle_note: body.note?.trim() || null,
            updated_at: now,
          }

  const { data, error } = await admin
    .from('businesses')
    .update(values)
    .eq('id', businessId)
    .select('id, status, archived_at, archive_reason, restore_requested_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (body.action !== 'restore' && existingBusiness.legacy_profile_id) {
    const { error: offerError } = await admin
      .from('offers')
      .update({ is_active: false })
      .eq('business_id', existingBusiness.legacy_profile_id)

    if (offerError) {
      return NextResponse.json({ error: offerError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ business: data })
}
