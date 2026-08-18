'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'
const WORKSPACE_PREFERENCE_MAX_AGE = 60 * 60 * 24 * 180

function readSelectedWorkspace() {
  const prefix = `${WORKSPACE_PREFERENCE_COOKIE}=`
  const entry = document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))

  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null
}

export default function BusinessWorkspaceContext({
  workspaceKey,
}: {
  workspaceKey: string
}) {
  const router = useRouter()

  useEffect(() => {
    if (readSelectedWorkspace() === workspaceKey) return

    const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = [
      `${WORKSPACE_PREFERENCE_COOKIE}=${encodeURIComponent(workspaceKey)}`,
      'Path=/',
      `Max-Age=${WORKSPACE_PREFERENCE_MAX_AGE}`,
      'SameSite=Lax',
      secureAttribute,
    ]
      .filter(Boolean)
      .join('; ')

    router.refresh()
  }, [router, workspaceKey])

  return null
}
