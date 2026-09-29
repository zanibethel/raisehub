import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function encryptionKey() {
  const secret = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY
  if (!secret) throw new Error('Missing GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY.')
  return createHash('sha256').update(secret).digest()
}

export function encryptCalendarToken(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.')
}

export function decryptCalendarToken(value: string) {
  const [ivText, tagText, encryptedText] = value.split('.')
  if (!ivText || !tagText || !encryptedText) throw new Error('Invalid encrypted calendar token.')
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
