import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSafeInternalPath } from '@/lib/navigation/safe-internal-path'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)

  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = getSafeInternalPath(requestUrl.searchParams.get('next'))

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL('/forgot-password?error=invalid_link', requestUrl.origin)
    )
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error) {
    return NextResponse.redirect(
      new URL('/forgot-password?error=expired_link', requestUrl.origin)
    )
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
