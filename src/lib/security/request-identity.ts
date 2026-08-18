import 'server-only'

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const forwardedIp = forwarded?.split(',')[0]?.trim()

  return (
    forwardedIp ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  )
}

export function buildPublicRateLimitSubject(input: {
  request: Request
  discriminator?: string | null
}): string {
  const ip = getClientIp(input.request)
  const discriminator = input.discriminator?.trim().toLowerCase() || 'anonymous'

  return `ip:${ip}|subject:${discriminator}`
}
