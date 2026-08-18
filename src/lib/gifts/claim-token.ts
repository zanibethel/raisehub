import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

export function createGiftClaimToken() {
  return randomBytes(32).toString('base64url')
}

export function hashGiftClaimToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
