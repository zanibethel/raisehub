import { NextResponse } from 'next/server'

import { GOOGLE_CALENDAR_SCOPES, readGoogleCalendarState } from '@/lib/calendar/google-oauth'
import { encryptCalendarToken } from '@/lib/calendar/token-crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  error?: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = readGoogleCalendarState(url.searchParams.get('state') || '')
  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard?calendar=invalid_oauth', url.origin))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== state.userId) {
    return NextResponse.redirect(new URL('/login?next=/dashboard', url.origin))
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${state.returnTo}?calendar=not_configured`, url.origin))
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${url.origin}/api/integrations/google-calendar/callback`,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  })
  const tokens = (await tokenResponse.json().catch(() => ({}))) as TokenResponse
  if (!tokenResponse.ok || !tokens.access_token) {
    return NextResponse.redirect(new URL(`${state.returnTo}?calendar=oauth_failed`, url.origin))
  }

  const admin = createAdminClient() as any
  const { data: existing } = await admin
    .from('business_calendar_connections')
    .select('encrypted_refresh_token')
    .eq('business_id', state.businessId)
    .eq('provider', 'google')
    .maybeSingle()

  const refreshToken = tokens.refresh_token
    ? encryptCalendarToken(tokens.refresh_token)
    : existing?.encrypted_refresh_token

  if (!refreshToken) {
    return NextResponse.redirect(new URL(`${state.returnTo}?calendar=refresh_token_missing`, url.origin))
  }

  const expiresAt = new Date(Date.now() + Math.max(60, tokens.expires_in ?? 3600) * 1000).toISOString()
  const scopes = tokens.scope?.split(/\s+/).filter(Boolean) ?? [...GOOGLE_CALENDAR_SCOPES]

  const { error } = await admin.from('business_calendar_connections').upsert({
    business_id: state.businessId,
    provider: 'google',
    calendar_id: 'primary',
    encrypted_access_token: encryptCalendarToken(tokens.access_token),
    encrypted_refresh_token: refreshToken,
    token_expires_at: expiresAt,
    granted_scopes: scopes,
    connection_status: 'connected',
    last_error: null,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id,provider' })

  const result = error ? 'save_failed' : 'connected'
  return NextResponse.redirect(new URL(`${state.returnTo}?calendar=${result}`, url.origin))
}
