import { NextResponse } from 'next/server'

import { buildPublicRateLimitSubject } from '@/lib/security/request-identity'
import { consumeRateLimit } from '@/lib/security/rate-limit'
import { createClient } from '@/lib/supabase/server'

type PasswordResetBody = {
  email?: unknown
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 254) : ''
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: Request) {
  let body: PasswordResetBody

  try {
    body = (await request.json()) as PasswordResetBody
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 })
  }

  const email = normalizeEmail(body.email)

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  try {
    const decision = await consumeRateLimit({
      scope: 'auth:password_reset',
      subject: buildPublicRateLimitSubject({ request, discriminator: email }),
      limit: 3,
      windowSeconds: 15 * 60,
    })

    if (!decision.allowed) {
      return NextResponse.json(
        { error: 'Too many password-reset attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.max(decision.retryAfterSeconds, 1)) },
        }
      )
    }
  } catch (error) {
    console.error('Unable to confirm password-reset rate limit:', error)
    return NextResponse.json(
      { error: 'Password recovery is temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  const origin = new URL(request.url).origin
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/update-password')}`
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    console.error('Unable to send password-reset email:', error.message)

    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Too many password-reset attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    return NextResponse.json(
      { error: 'Password recovery is temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  return NextResponse.json(
    {
      success: true,
      message: 'If an account matches that email, a password-reset link will be sent shortly.',
    },
    { status: 202 }
  )
}
