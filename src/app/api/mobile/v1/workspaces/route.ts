import { NextResponse } from 'next/server'

import { parseMobileBearerAuthorization } from '@/lib/mobile/workspace-contract'
import { getMobileWorkspaceBootstrap } from '@/lib/services/mobile-workspace-service'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store, private' }

export async function GET(request: Request) {
  const accessToken = parseMobileBearerAuthorization(
    request.headers.get('authorization')
  )

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: noStore }
    )
  }

  try {
    const result = await getMobileWorkspaceBootstrap(accessToken)
    if (!result) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: noStore }
      )
    }

    return NextResponse.json(result, { headers: noStore })
  } catch {
    // Fail closed: never expose data, provider errors, or tokens to the client.
    return NextResponse.json(
      { error: 'Workspaces are temporarily unavailable' },
      { status: 503, headers: noStore }
    )
  }
}
