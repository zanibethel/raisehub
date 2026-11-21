import 'react-native-url-polyfill/auto'

import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * SecureStore values are chunked to avoid native payload-size limits.
 * A versioned pointer is committed only after every encrypted chunk is saved.
 */
const CHUNK_LENGTH = 1500
const headKey = (key: string) => key + '.head'
const partKey = (key: string, revision: string, index: number) =>
  key + '.part.' + revision + '.' + index

type Head = { revision: string; count: number }
function parseHead(value: string | null): Head | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Head
    if (
      typeof parsed.revision === 'string' &&
      /^[0-9a-z]+$/.test(parsed.revision) &&
      Number.isInteger(parsed.count) &&
      parsed.count > 0 &&
      parsed.count < 100
    ) return parsed
  } catch {}
  return null
}

async function removeChunks(key: string, head: Head | null) {
  if (!head) return
  for (let i = 0; i < head.count; i += 1) {
    await SecureStore.deleteItemAsync(partKey(key, head.revision, i))
  }
}

const encryptedSessionStorage = {
  async getItem(key: string) {
    const head = parseHead(await SecureStore.getItemAsync(headKey(key)))
    if (!head) return null

    const chunks = await Promise.all(
      Array.from({ length: head.count }, (_, i) =>
        SecureStore.getItemAsync(partKey(key, head.revision, i))
      )
    )
    if (chunks.some((chunk) => chunk === null)) return null
    return chunks.join('')
  },

  async setItem(key: string, value: string) {
    const previous = parseHead(await SecureStore.getItemAsync(headKey(key)))
    const revision = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    const chunks = value.match(/[\s\S]{1,1500}/g) ?? ['']
    if (chunks.length >= 100) throw new Error('Session is too large')

    for (let i = 0; i < chunks.length; i += 1) {
      await SecureStore.setItemAsync(partKey(key, revision, i), chunks[i])
    }
    await SecureStore.setItemAsync(
      headKey(key),
      JSON.stringify({ revision, count: chunks.length })
    )
    try { await removeChunks(key, previous) } catch {}
  },

  async removeItem(key: string) {
    const previous = parseHead(await SecureStore.getItemAsync(headKey(key)))
    await SecureStore.deleteItemAsync(headKey(key))
    await removeChunks(key, previous)
  },
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage: encryptedSessionStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null

if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase?.auth.startAutoRefresh()
    else supabase?.auth.stopAutoRefresh()
  })
}

export const apiBaseUrl = process.env.EXPO_PUBLIC_RAISEHUB_BASE_URL
