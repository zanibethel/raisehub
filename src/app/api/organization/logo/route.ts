import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const MAX_LOGO_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

function storagePathFromUrl(url: string | null): string | null {
  if (!url) return null
  const marker = '/storage/v1/object/public/logos/'
  const index = url.indexOf(marker)
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length))
}

async function requireManager(organizationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient() as any
  const { data: organization } = await admin
    .from('organizations')
    .select('id, legacy_profile_id, logo_url')
    .eq('id', organizationId)
    .maybeSingle()

  if (!organization) return null
  if (organization.legacy_profile_id === user.id) return { user, organization, admin }

  const { data: membership } = await admin
    .from('organization_memberships')
    .select('membership_role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('membership_role', ['admin', 'manager'])
    .maybeSingle()

  return membership ? { user, organization, admin } : null
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const organizationId = String(formData.get('organizationId') ?? '').trim()
  const file = formData.get('logo')

  if (!organizationId || !(file instanceof File)) {
    return NextResponse.json({ error: 'Organization and logo are required.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Use a PNG, JPG, WebP, or GIF image.' }, { status: 400 })
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: 'Logo must be 5 MB or smaller.' }, { status: 400 })
  }

  const access = await requireManager(organizationId)
  if (!access) return NextResponse.json({ error: 'Organization manager access required.' }, { status: 403 })

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
  const path = `organizations/${organizationId}-${Date.now()}.${extension}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await access.admin.storage.from('logos').upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: publicUrlData } = access.admin.storage.from('logos').getPublicUrl(path)
  const logoUrl = publicUrlData.publicUrl
  const { error: updateError } = await access.admin
    .from('organizations')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('id', organizationId)

  if (updateError) {
    await access.admin.storage.from('logos').remove([path])
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const oldPath = storagePathFromUrl(access.organization.logo_url)
  if (oldPath && oldPath !== path) await access.admin.storage.from('logos').remove([oldPath])

  return NextResponse.json({ success: true, logoUrl })
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { organizationId?: string }
  const organizationId = body.organizationId?.trim()
  if (!organizationId) return NextResponse.json({ error: 'Organization is required.' }, { status: 400 })

  const access = await requireManager(organizationId)
  if (!access) return NextResponse.json({ error: 'Organization manager access required.' }, { status: 403 })

  const { error } = await access.admin
    .from('organizations')
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq('id', organizationId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const oldPath = storagePathFromUrl(access.organization.logo_url)
  if (oldPath) await access.admin.storage.from('logos').remove([oldPath])

  return NextResponse.json({ success: true })
}
