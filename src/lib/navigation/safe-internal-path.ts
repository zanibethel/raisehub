const INTERNAL_ORIGIN = 'https://raisehub.local'

/**
 * Returns a same-origin application path or a safe fallback.
 *
 * Untrusted `next` query parameters must never be able to redirect a user
 * away from RaiseHub.
 */
export function getSafeInternalPath(
  value: string | null | undefined,
  fallback = '/dashboard'
) {
  const candidate = value?.trim()

  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.startsWith('/\\')
  ) {
    return fallback
  }

  try {
    const resolved = new URL(candidate, INTERNAL_ORIGIN)

    if (resolved.origin !== INTERNAL_ORIGIN) {
      return fallback
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return fallback
  }
}
