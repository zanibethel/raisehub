import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseMobileBearerAuthorization,
  selectAuthorizedMobileWorkspace,
  toMobileWorkspaces,
  type MobileWorkspace,
} from './workspace-contract'

const workspaces: MobileWorkspace[] = [
  {
    key: 'customer:user-1',
    kind: 'customer',
    name: 'My Pass',
    subtitle: 'Deals and savings',
    workspaceId: 'user-1',
    isDefault: true,
  },
  {
    key: 'business:biz-1',
    kind: 'business',
    name: 'A business',
    subtitle: 'Business staff',
    workspaceId: 'biz-1',
    isDefault: false,
  },
  {
    key: 'organization:org-1',
    kind: 'organization',
    name: 'An organization',
    subtitle: 'Organization manager',
    workspaceId: 'org-1',
    isDefault: false,
  },
]

test('an existing authorized selection is retained without changing account', () => {
  assert.equal(
    selectAuthorizedMobileWorkspace(workspaces, 'business:biz-1')?.key,
    'business:biz-1'
  )
})

test('removed workspaces do not survive a capabilities refresh', () => {
  assert.equal(
    selectAuthorizedMobileWorkspace(workspaces, 'business:revoked')?.key,
    'customer:user-1'
  )
})

test('empty capability results never invent another role', () => {
  assert.equal(selectAuthorizedMobileWorkspace([], 'owner:forged'), null)
})

test('serialized workspaces contain navigation context only', () => {
  const [serialized] = toMobileWorkspaces([
    {
      ...workspaces[0],
      href: '/dashboard',
      membershipId: null,
      legacyProfileId: 'legacy-user-id',
      source: 'legacy-profile',
      logoUrl: null,
    },
  ])
  assert.deepEqual(Object.keys(serialized).sort(), [
    'isDefault', 'key', 'kind', 'name', 'subtitle', 'workspaceId',
  ])
  assert.equal('legacyProfileId' in serialized, false)
  assert.equal('href' in serialized, false)
})

test('mobile bearer parser rejects missing, malformed, and oversized headers', () => {
  assert.equal(parseMobileBearerAuthorization(null), null)
  assert.equal(parseMobileBearerAuthorization('Basic abc'), null)
  assert.equal(parseMobileBearerAuthorization('Bearer not-a-jwt'), null)
  assert.equal(parseMobileBearerAuthorization('Bearer ' + 'a'.repeat(8200)), null)
  assert.equal(parseMobileBearerAuthorization('Bearer ab.cd.ef'), 'ab.cd.ef')
})
