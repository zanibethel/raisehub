import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const headerSource = readFileSync(
  new URL('./authenticated-workspace-header.tsx', import.meta.url),
  'utf8'
)
const accountMenuSource = readFileSync(
  new URL('./account-menu.tsx', import.meta.url),
  'utf8'
)
const navSource = readFileSync(
  new URL('./nav.tsx', import.meta.url),
  'utf8'
)
const workspaceServiceSource = readFileSync(
  new URL('../../lib/services/authenticated-workspace-service.ts', import.meta.url),
  'utf8'
)

function workspaceSelectionHandler(source: string) {
  const start = source.indexOf('function handleWorkspaceSelection')
  const end = source.indexOf('async function handleLogout', start)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  return source.slice(start, end)
}

test('workspace switches navigate once without a redundant refresh', () => {
  for (const source of [headerSource, accountMenuSource]) {
    const handler = workspaceSelectionHandler(source)

    assert.match(handler, /router\.push\(workspace\.href\)/)
    assert.doesNotMatch(handler, /router\.refresh\(\)/)
  }
})

test('authenticated workspace resolution is memoized for a server render', () => {
  assert.match(workspaceServiceSource, /import \{ cache \} from 'react'/)
  assert.match(
    workspaceServiceSource,
    /export const getAuthenticatedWorkspaces = cache\(/
  )
})

test('workspace entities carry already-loaded logos into navigation', () => {
  assert.match(
    workspaceServiceSource,
    /logoUrl: access\.business\.logo_url/
  )
  assert.match(
    workspaceServiceSource,
    /logoUrl: access\.organization\.logo_url/
  )
  assert.match(navSource, /selectedWorkspace\?\.logoUrl \?\? null/)
})
