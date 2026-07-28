import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: string }>()

  return profile?.role === 'owner' ? profile : null
}

function clean(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function PATCH(request: Request) {
  const owner = await requireOwner()
  if (!owner) return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    workspaceId?: string
    workspaceRole?: 'business' | 'organization' | 'customer'
    name?: string
    email?: string
    phone?: string
    address?: string
    websiteUrl?: string
    logoUrl?: string
    description?: string
    category?: string
    facebookUrl?: string
    instagramUrl?: string
    tiktokUrl?: string
    isDemo?: boolean
  }

  const workspaceId = body.workspaceId?.trim()
  const workspaceRole = body.workspaceRole
  if (!workspaceId || !workspaceRole) {
    return NextResponse.json({ error: 'Workspace and role are required.' }, { status: 400 })
  }

  const admin = createAdminClient() as any
  let profileId = workspaceId
  const now = new Date().toISOString()

  if (workspaceRole === 'business') {
    const { data, error } = await admin.from('businesses').select('legacy_profile_id').eq('id', workspaceId).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.legacy_profile_id) return NextResponse.json({ error: 'Business profile connection not found.' }, { status: 404 })
    profileId = data.legacy_profile_id

    const { error: businessError } = await admin.from('businesses').update({
      name: clean(body.name),
      email: clean(body.email),
      phone: clean(body.phone),
      address: clean(body.address),
      website_url: clean(body.websiteUrl),
      logo_url: clean(body.logoUrl),
      description: clean(body.description),
      category: clean(body.category),
      is_demo: Boolean(body.isDemo),
      demo_group: body.isDemo ? 'owner_managed_demo' : null,
      updated_at: now,
    }).eq('id', workspaceId)
    if (businessError) return NextResponse.json({ error: businessError.message }, { status: 500 })
  }

  if (workspaceRole === 'organization') {
    const { data, error } = await admin.from('organizations').select('legacy_profile_id').eq('id', workspaceId).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.legacy_profile_id) return NextResponse.json({ error: 'Organization profile connection not found.' }, { status: 404 })
    profileId = data.legacy_profile_id

    const { error: organizationError } = await admin.from('organizations').update({
      name: clean(body.name),
      email: clean(body.email),
      phone: clean(body.phone),
      website_url: clean(body.websiteUrl),
      logo_url: clean(body.logoUrl),
      description: clean(body.description),
      is_demo: Boolean(body.isDemo),
      demo_group: body.isDemo ? 'owner_managed_demo' : null,
      updated_at: now,
    }).eq('id', workspaceId)
    if (organizationError) return NextResponse.json({ error: organizationError.message }, { status: 500 })
  }

  const profileValues: Record<string, unknown> = {
    email: clean(body.email),
    phone: clean(body.phone),
    address: clean(body.address),
    website_url: clean(body.websiteUrl),
    logo_url: clean(body.logoUrl),
    business_description: clean(body.description),
    business_category: clean(body.category),
    facebook_url: clean(body.facebookUrl),
    instagram_url: clean(body.instagramUrl),
    tiktok_url: clean(body.tiktokUrl),
    is_demo: Boolean(body.isDemo),
    demo_group: body.isDemo ? 'owner_managed_demo' : null,
    updated_at: now,
  }

  if (workspaceRole === 'business') profileValues.business_name = clean(body.name)
  else profileValues.display_name = clean(body.name)

  const { error: profileError } = await admin.from('profiles').update(profileValues).eq('id', profileId)
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ success: true, updatedBy: owner.id })
}
