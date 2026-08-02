import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_AUTH_COOKIE_PATTERN = /^sb-.+-auth-token(?:\.\d+)?$/

export function isSupabaseAuthCookie(name: string) {
  return SUPABASE_AUTH_COOKIE_PATTERN.test(name)
}

export function isRecoverableSessionError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const candidate = error as {
    code?: unknown
    message?: unknown
    status?: unknown
  }

  const code = typeof candidate.code === 'string' ? candidate.code : ''
  const message =
    typeof candidate.message === 'string' ? candidate.message.toLowerCase() : ''

  return (
    code === 'refresh_token_not_found' ||
    code === 'invalid_refresh_token' ||
    (candidate.status === 400 && message.includes('refresh token'))
  )
}

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse
) {
  for (const cookie of request.cookies.getAll()) {
    if (!isSupabaseAuthCookie(cookie.name)) continue

    request.cookies.delete(cookie.name)
    response.cookies.set(cookie.name, '', {
      expires: new Date(0),
      maxAge: 0,
      path: '/',
    })
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          response = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let claimsError: unknown = null

  try {
    const { error } = await supabase.auth.getClaims()
    claimsError = error
  } catch (error) {
    claimsError = error
  }

  if (claimsError) {
    if (!isRecoverableSessionError(claimsError)) throw claimsError

    clearSupabaseAuthCookies(request, response)
  }

  return response
}
