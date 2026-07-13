import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/app-mode'

// =========================================
// 🔒 DEMO LOGIN ROUTE HANDLER
//
// Accepts a role (customer | business | organization) and
// signs the user in using server-only credentials.
//
// Security properties:
// - Credentials come from server-only environment variables
//   (no NEXT_PUBLIC_ prefix, never sent to the browser).
// - Demo mode must be active; requests in production mode
//   are rejected immediately.
// - The owner role is always rejected.
// - Missing server configuration returns a safe error
//   rather than attempting a fallback.
// - The password is never included in any response body
//   or error message.
//
// Required server-only environment variables:
//   DEMO_CUSTOMER_EMAIL
//   DEMO_BUSINESS_EMAIL
//   DEMO_ORGANIZATION_EMAIL
//   DEMO_ACCOUNT_PASSWORD
// =========================================

const ALLOWED_ROLES = ['customer', 'business', 'organization'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

function isAllowedRole(value: unknown): value is AllowedRole {
  return ALLOWED_ROLES.includes(value as AllowedRole)
}

export async function POST(request: Request) {
  // Only active in demo mode
  if (!isDemoMode()) {
    return NextResponse.json(
      { error: 'Demo login is not available in this environment.' },
      { status: 403 }
    )
  }

  // Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const role = (body as Record<string, unknown>)?.role

  if (!isAllowedRole(role)) {
    return NextResponse.json(
      { error: 'Unsupported demo role.' },
      { status: 400 }
    )
  }

  // Map role to credentials from server-only environment variables
  const emailMap: Record<AllowedRole, string | undefined> = {
    customer: process.env.DEMO_CUSTOMER_EMAIL,
    business: process.env.DEMO_BUSINESS_EMAIL,
    organization: process.env.DEMO_ORGANIZATION_EMAIL,
  }

  const email = emailMap[role]
  const password = process.env.DEMO_ACCOUNT_PASSWORD

  if (!email || !password) {
    return NextResponse.json(
      {
        error:
          'Demo account configuration is incomplete. Contact the platform administrator.',
      },
      { status: 503 }
    )
  }

  // Sign in using the Supabase server client.
  // The server client's cookie handler (setAll) will write the auth
  // session tokens to the response cookies automatically.
  const supabase = await createClient()

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    return NextResponse.json(
      { error: 'Demo login failed. Please try again.' },
      { status: 401 }
    )
  }

  return NextResponse.json({ ok: true })
}
