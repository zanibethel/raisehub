import { NextResponse } from 'next/server'

import { isDemoMode } from '@/lib/app-mode'
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

type ProfileRole =
  | 'customer'
  | 'business'
  | 'organization'
  | 'admin'
  | 'owner'

type Profile = {
  id: string
  role: ProfileRole
}

// =============================================================================
// Validation
// =============================================================================

function isAllowedRole(
  value: unknown
): value is AllowedRole {
  return ALLOWED_ROLES.includes(
    value as AllowedRole
  )
}

// =============================================================================
// Owner preview
// =============================================================================

function buildOwnerPreviewHref(
  role: AllowedRole
): string {
  return `/dashboard?previewRole=${encodeURIComponent(
    role
  )}`
}

async function getAuthenticatedOwnerPreviewHref(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  role: AllowedRole
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single<Profile>()

  if (profile?.role !== 'owner') {
    return null
  }

  return buildOwnerPreviewHref(role)
}

// =============================================================================
// Demo login route
// =============================================================================

export async function POST(request: Request) {
  if (!isDemoMode()) {
    return NextResponse.json(
      {
        error:
          'Demo login is not available in this environment.',
      },
      { status: 403 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request.' },
      { status: 400 }
    )
  }

  const role = (
    body as Record<string, unknown>
  )?.role

  if (!isAllowedRole(role)) {
    return NextResponse.json(
      { error: 'Unsupported demo role.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Owners remain authenticated as owners and use the existing preview system.
  // This prevents demo exploration from replacing the permanent owner session.
  const ownerPreviewHref =
    await getAuthenticatedOwnerPreviewHref(
      supabase,
      role
    )

  if (ownerPreviewHref) {
    return NextResponse.json({
      ok: true,
      mode: 'owner-preview',
      href: ownerPreviewHref,
    })
  }

  // Public and non-owner demo visitors continue using designated demo accounts.
  const emailMap: Record<
    AllowedRole,
    string | undefined
  > = {
    customer: process.env.DEMO_CUSTOMER_EMAIL,
    business: process.env.DEMO_BUSINESS_EMAIL,
    organization:
      process.env.DEMO_ORGANIZATION_EMAIL,
  }

  const email = emailMap[role]
  const password =
    process.env.DEMO_ACCOUNT_PASSWORD

  if (!email || !password) {
    return NextResponse.json(
      {
        error:
          'Demo account configuration is incomplete. Contact the platform administrator.',
      },
      { status: 503 }
    )
  }

  const { error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (authError) {
    return NextResponse.json(
      {
        error:
          'Demo login failed. Please try again.',
      },
      { status: 401 }
    )
  }

  return NextResponse.json({
    ok: true,
    mode: 'demo-account',
    href: '/dashboard',
  })
}