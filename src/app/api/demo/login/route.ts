import { NextResponse } from 'next/server'

import { isDemoMode } from '@/lib/app-mode'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

const ALLOWED_ROLES = [
  'customer',
  'business',
  'organization',
] as const

type AllowedRole = (typeof ALLOWED_ROLES)[number]

type ProfileRole = AllowedRole | 'admin' | 'owner'

type ActorProfile = {
  id: string
  role: ProfileRole
  is_demo: boolean | null
  demo_group: string | null
}

type DemoGroup = {
  id: string
  group_key: string
  status: string
  is_default: boolean
}

type DemoProfile = {
  profile_id: string | null
  role: string
  status: string
}

type PublicDemoProfile = {
  id: string
  email: string | null
  role: string
  is_demo: boolean | null
  demo_group: string | null
}

// =============================================================================
// Validation
// =============================================================================

function isAllowedRole(value: unknown): value is AllowedRole {
  return ALLOWED_ROLES.includes(value as AllowedRole)
}

function normalizeGroupKey(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()

  if (!normalized) return null

  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalized)
    ? normalized
    : null
}

// =============================================================================
// Demo context
// =============================================================================

function buildOwnerPreviewHref(
  role: AllowedRole,
  groupKey: string | null
): string {
  const params = new URLSearchParams({ previewRole: role })

  if (groupKey) {
    params.set('groupKey', groupKey)
  }

  return `/dashboard/owner/preview?${params.toString()}`
}

async function getActorProfile(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ActorProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_demo, demo_group')
    .eq('id', user.id)
    .maybeSingle<ActorProfile>()

  return profile ?? null
}

async function resolveDemoGroup(
  requestedGroupKey: string | null,
  actorProfile: ActorProfile | null
): Promise<DemoGroup | null> {
  const admin = createAdminClient()

  const actorGroupKey =
    actorProfile?.is_demo === true
      ? normalizeGroupKey(actorProfile.demo_group)
      : null

  const targetGroupKey = requestedGroupKey ?? actorGroupKey

  if (targetGroupKey) {
    const { data } = await admin
      .from('demo_groups')
      .select('id, group_key, status, is_default')
      .eq('group_key', targetGroupKey)
      .eq('status', 'active')
      .maybeSingle<DemoGroup>()

    return data ?? null
  }

  const { data } = await admin
    .from('demo_groups')
    .select('id, group_key, status, is_default')
    .eq('status', 'active')
    .eq('is_default', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<DemoGroup>()

  return data ?? null
}

async function resolvePublicDemoProfile(
  role: AllowedRole,
  group: DemoGroup,
  configuredEmail: string
): Promise<PublicDemoProfile | null> {
  const admin = createAdminClient()
  const normalizedEmail = configuredEmail.trim().toLowerCase()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, role, is_demo, demo_group')
    .eq('email', normalizedEmail)
    .eq('role', role)
    .eq('is_demo', true)
    .eq('demo_group', group.group_key)
    .maybeSingle<PublicDemoProfile>()

  if (!profile?.id || !profile.email) return null

  const { data: demoProfile } = await admin
    .from('demo_profiles')
    .select('profile_id, role, status')
    .eq('demo_group_id', group.id)
    .eq('profile_id', profile.id)
    .eq('role', role)
    .eq('status', 'active')
    .maybeSingle<DemoProfile>()

  if (!demoProfile?.profile_id) return null

  return profile
}

// =============================================================================
// Demo login route
// =============================================================================

export async function POST(request: Request) {
  if (!isDemoMode()) {
    return NextResponse.json(
      { error: 'Demo login is not available in this environment.' },
      { status: 403 }
    )
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { error: 'Invalid request.' },
      { status: 400 }
    )
  }

  const role = body.role

  if (!isAllowedRole(role)) {
    return NextResponse.json(
      { error: 'Unsupported demo role.' },
      { status: 400 }
    )
  }

  const rawGroupKey = body.groupKey
  const requestedGroupKey = normalizeGroupKey(rawGroupKey)

  if (
    rawGroupKey !== undefined &&
    rawGroupKey !== null &&
    requestedGroupKey === null
  ) {
    return NextResponse.json(
      { error: 'Invalid demo group.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const actorProfile = await getActorProfile(supabase)
  const group = await resolveDemoGroup(requestedGroupKey, actorProfile)

  if (!group) {
    return NextResponse.json(
      {
        error:
          'That demo scenario is not currently available. Please choose another experience.',
      },
      { status: 404 }
    )
  }

  // Owners keep their permanent session and render the selected demo identity
  // through the dedicated Experience Viewer.
  if (actorProfile?.role === 'owner') {
    return NextResponse.json({
      ok: true,
      mode: 'owner-preview',
      groupKey: group.group_key,
      href: buildOwnerPreviewHref(role, group.group_key),
    })
  }

  const emailMap: Record<AllowedRole, string | undefined> = {
    customer: process.env.DEMO_CUSTOMER_EMAIL,
    business: process.env.DEMO_BUSINESS_EMAIL,
    organization: process.env.DEMO_ORGANIZATION_EMAIL,
  }

  const configuredEmail = emailMap[role]
  const password = process.env.DEMO_ACCOUNT_PASSWORD

  if (!configuredEmail || !password) {
    return NextResponse.json(
      {
        error:
          'The interactive demo is temporarily unavailable. Please try again later.',
      },
      { status: 503 }
    )
  }

  const selectedProfile = await resolvePublicDemoProfile(
    role,
    group,
    configuredEmail
  )

  if (!selectedProfile?.email) {
    return NextResponse.json(
      {
        error:
          'This role is not ready in the selected demo scenario. Please choose another experience.',
      },
      { status: 409 }
    )
  }

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: selectedProfile.email,
      password,
    })

  if (authError || authData.user?.id !== selectedProfile.id) {
    await supabase.auth.signOut()

    return NextResponse.json(
      { error: 'Demo login failed. Please try again.' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    ok: true,
    mode: 'demo-account',
    groupKey: group.group_key,
    href: '/dashboard',
  })
}
