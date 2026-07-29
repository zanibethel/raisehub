import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const MAX_LOGO_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

type OwnerProfile = { id: string; role: string }
type DemoBusinessProfile = {
  id: string
  business_name: string | null
  display_name: string | null
  logo_url: string | null
  demo_group: string | null
}

type AdminClient = ReturnType<typeof createAdminClient>

async function requireOwner(): Promise<OwnerProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<OwnerProfile>()

  return profile?.role === 'owner' ? profile : null
}

function storagePathFromUrl(url: string | null): string | null {
  if (!url) return null
  const marker = '/storage/v1/object/public/logos/'
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}

async function findDemoBusiness(admin: AdminClient, profileId: string) {
  const { data, error } = await admin
    .from('profiles')
    .select('id, business_name, display_name, logo_url, demo_group')
    .eq('id', profileId)
    .eq('role', 'business')
    .eq('is_demo', true)
    .maybeSingle<DemoBusinessProfile>()

  if (error) throw new Error(error.message)
  return data
}

export async function GET() {
  const owner = await requireOwner()
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })
  }

  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('profiles')
    .select('id, business_name, display_name, logo_url, demo_group')
    .eq('role', 'business')
    .eq('is_demo', true)
    .order('business_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const businesses = (data ?? []).map((profile: DemoBusinessProfile) => ({
    id: profile.id,
    name: profile.display_name?.trim() || profile.business_name?.trim() || 'Demo business',
    logoUrl: profile.logo_url,
    demoGroup: profile.demo_group,
  }))

  return NextResponse.json({ businesses })
}

export async function POST(request: Request) {
  const owner = await requireOwner()
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })
  }

  const formData = await request.formData()
  const profileId = String(formData.get('profileId') ?? '').trim()
  const file = formData.get('logo')

  if (!profileId || !(file instanceof File)) {
    return NextResponse.json({ error: 'Demo business and logo are required.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Use a PNG, JPG, WebP, or GIF image.' }, { status: 400 })
  }

  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: 'Logo must be 5 MB or smaller.' }, { status: 400 })
  }

  const admin = createAdminClient() as any

  try {
    const profile = await findDemoBusiness(admin, profileId)
    if (!profile) {
      return NextResponse.json({ error: 'Demo business not found.' }, { status: 404 })
    }

    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const path = `demo-businesses/${profileId}-${Date.now()}.${extension}`
    const bytes = await file.arrayBuffer()

    const { error: uploadError } = await admin.storage.from('logos').upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) throw new Error(uploadError.message)

    const { data: publicUrlData } = admin.storage.from('logos').getPublicUrl(path)
    const logoUrl = publicUrlData.publicUrl
    const now = new Date().toISOString()

    const { error: profileError } = await admin
      .from('profiles')
      .update({ logo_url: logoUrl, updated_at: now })
      .eq('id', profileId)
      .eq('is_demo', true)
      .eq('role', 'business')

    if (profileError) {
      await admin.storage.from('logos').remove([path])
      throw new Error(profileError.message)
    }

    const { error: businessError } = await admin
      .from('businesses')
      .update({ logo_url: logoUrl, updated_at: now })
      .eq('legacy_profile_id', profileId)
      .eq('is_demo', true)

    if (businessError) throw new Error(businessError.message)

    const oldPath = storagePathFromUrl(profile.logo_url)
    if (oldPath && oldPath !== path) {
      await admin.storage.from('logos').remove([oldPath])
    }

    return NextResponse.json({ success: true, logoUrl, updatedBy: owner.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Logo could not be uploaded.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const owner = await requireOwner()
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as { profileId?: string }
  const profileId = body.profileId?.trim()

  if (!profileId) {
    return NextResponse.json({ error: 'Demo business is required.' }, { status: 400 })
  }

  const admin = createAdminClient() as any

  try {
    const profile = await findDemoBusiness(admin, profileId)
    if (!profile) {
      return NextResponse.json({ error: 'Demo business not found.' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const { error: profileError } = await admin
      .from('profiles')
      .update({ logo_url: null, updated_at: now })
      .eq('id', profileId)
      .eq('is_demo', true)
      .eq('role', 'business')

    if (profileError) throw new Error(profileError.message)

    const { error: businessError } = await admin
      .from('businesses')
      .update({ logo_url: null, updated_at: now })
      .eq('legacy_profile_id', profileId)
      .eq('is_demo', true)

    if (businessError) throw new Error(businessError.message)

    const oldPath = storagePathFromUrl(profile.logo_url)
    if (oldPath) await admin.storage.from('logos').remove([oldPath])

    return NextResponse.json({ success: true, updatedBy: owner.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Logo could not be removed.' },
      { status: 500 }
    )
  }
}
