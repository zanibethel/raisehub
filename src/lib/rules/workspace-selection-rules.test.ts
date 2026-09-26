import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveWorkspaceSelection } from './workspace-selection-rules'
import type {
  SelectableWorkspace,
  SelectableWorkspaceKind,
} from '../types/identity-access'

function makeWorkspace(
  kind: SelectableWorkspaceKind,
  id: string,
  options?: { isDefault?: boolean; name?: string }
): SelectableWorkspace {
  const key = `${kind}:${id}`

  return {
    key,
    kind,
    name: options?.name ?? key,
    subtitle: null,
    href: `/dashboard?workspace=${encodeURIComponent(key)}`,
    workspaceId: id,
    membershipId: null,
    legacyProfileId: null,
    source: 'legacy-profile',
    isDefault: options?.isDefault ?? false,
  }
}

test('invalid stale workspace falls back to the authenticated business experience', () => {
  const customer = makeWorkspace('customer', 'business-demo-user')
  const business = makeWorkspace('business', 'maple-street')

  const result = resolveWorkspaceSelection({
    requestedWorkspace: 'customer:other-demo-user',
    workspaces: [customer, business],
    legacyRole: 'business',
  })

  assert.equal(result.selectedWorkspaceKey, business.key)
  assert.equal(result.experienceRole, 'business')
  assert.equal(result.requestedWorkspaceWasValid, false)
  assert.equal(result.usedFallback, true)
})

test('a valid explicit workspace selection still wins over the profile role', () => {
  const customer = makeWorkspace('customer', 'business-demo-user')
  const business = makeWorkspace('business', 'maple-street')

  const result = resolveWorkspaceSelection({
    requestedWorkspace: customer.key,
    workspaces: [customer, business],
    legacyRole: 'business',
  })

  assert.equal(result.selectedWorkspaceKey, customer.key)
  assert.equal(result.experienceRole, 'customer')
  assert.equal(result.requestedWorkspaceWasValid, true)
  assert.equal(result.usedFallback, false)
})

test('organization profiles prefer an organization workspace before generic fallback', () => {
  const customer = makeWorkspace('customer', 'organization-demo-user')
  const organization = makeWorkspace('organization', 'lakeview')

  const result = resolveWorkspaceSelection({
    workspaces: [customer, organization],
    legacyRole: 'organization',
  })

  assert.equal(result.selectedWorkspaceKey, organization.key)
  assert.equal(result.experienceRole, 'organization')
})

test('an explicit default workspace remains the first fallback choice', () => {
  const customer = makeWorkspace('customer', 'user', { isDefault: true })
  const business = makeWorkspace('business', 'business')

  const result = resolveWorkspaceSelection({
    workspaces: [customer, business],
    legacyRole: 'business',
  })

  assert.equal(result.selectedWorkspaceKey, customer.key)
  assert.equal(result.experienceRole, 'customer')
})
