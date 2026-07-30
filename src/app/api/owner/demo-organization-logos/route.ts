import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const MAX_LOGO_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

type OwnerProfile = { id: string; role: string }
type DemoOrganization = {
  id: string
  name: string
  logo_url: string | null
  demo_group: string | null
}

async function requireOwner(): Promise<OwnerProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length))
}

async function findDemoOrganization(organizationId: string) {
  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('organizations')
    .select('id, name, logo_url, demo_group')
    .eq('id', organizationId)
    .eq('is_demo', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return { admin, organization: data as DemoOrganization | null }
}

export async function GET() {
  const owner = await requireOwner()
  if (!owner) return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })

  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('organizations')
    .select('id, name, logo_url, demo_group')
    .eq('is_demo', true)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    organizations: ((data ?? []) as DemoOrganization[]).map((organization) => ({
      id: organization.id,
      name: organization.name || 'Demo organization',
      logoUrl: organization.logo_url,
      demoGroup: organization.demo_group,
    })),
  })
}

export async function POST(request: Request) {
  const owner = await requireOwner()
  if (!owner) return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })

  const formData = await request.formData()
  const organizationId = String(formData.get('organizationId') ?? '').trim()
  const file = formData.get('logo')

  if (!organizationId || !(file instanceof File)) {
    return NextResponse.json({ error: 'Demo organization and logo are required.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Use a PNG, JPG, WebP, or GIF image.' }, { status: 400 })
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: 'Logo must be 5 MB or smaller.' }, { status: 400 })
  }

  try {
    const { admin, organization } = await findDemoOrganization(organizationId)
    if (!organization) return NextResponse.json({ error: 'Demo organization not found.' }, { status: 404 })

    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const path = `demo-organizations/${organizationId}-${Date.now()}.${extension}`
    const bytes = await file.arrayBuffer()

    const { error: uploadError } = await admin.storage.from('logos').upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) throw new Error(uploadError.message)

    const { data: publicUrlData } = admin.storage.from('logos').getPublicUrl(path)
    const logoUrl = publicUrlData.publicUrl
    const { error: updateError } = await admin
      .from('organizations')
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq('id', organizationId)
      .eq('is_demo', true)

    if (updateError) {
      await admin.storage.from('logos').remove([path])
      throw new Error(updateError.message)
    }

    const oldPath = storagePathFromUrl(organization.logo_url)
    if (oldPath && oldPath !== path) await admin.storage.from('logos').remove([oldPath])

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
  if (!owner) return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as { organizationId?: string }
  const organizationId = body.organizationId?.trim()
  if (!organizationId) return NextResponse.json({ error: 'Demo organization is required.' }, { status: 400 })

  try {
    const { admin, organization } = await findDemoOrganization(organizationId)
    if (!organization) return NextResponse.json({ error: 'Demo organization not found.' }, { status: 404 })

    const { error } = await admin
      .from('organizations')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', organizationId)
      .eq('is_demo', true)
    if (error) throw new Error(error.message)

    const oldPath = storagePathFromUrl(organization.logo_url)
    if (oldPath) await admin.storage.from('logos').remove([oldPath])

    return NextResponse.json({ success: true, updatedBy: owner.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Logo could not be removed.' },
      { status: 500 }
    )
  }
}
