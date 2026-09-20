import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrganizationComplianceSnapshot,
  getOrganizationComplianceCompleteness,
  maskTaxIdLast4,
  normalizeOrganizationComplianceProfile,
  serializeOrganizationComplianceProfile,
} from './compliance-profile'

test('normalizes optional compliance values without storing a full tax identifier', () => {
  const profile = serializeOrganizationComplianceProfile({
    legalEntityName: 'Westside PTO',
    taxIdLast4: '12-3456789',
    taxExemptStatus: 'organization_reported_exempt',
    authorizationStatus: 'school_confirmed',
    authorizationContactName: 'Alex Sponsor',
    authorizationContactRole: 'Principal',
    authorizationContactEmail: 'principal@example.org',
  })

  assert.equal(profile.taxIdLast4, '6789')
  assert.equal(maskTaxIdLast4(profile.taxIdLast4), '**-***6789')
})

test('school compliance completeness is informational and adapts to available values', () => {
  const profile = normalizeOrganizationComplianceProfile({
    legalEntityName: 'Westside PTO',
    taxExemptStatus: 'organization_reported_exempt',
    authorizationStatus: 'school_confirmed',
  })

  const completeness = getOrganizationComplianceCompleteness({
    organizationType: 'pta_pto',
    profile,
  })

  assert.equal(completeness.total, 8)
  assert.equal(completeness.completed, 4)
  assert.deepEqual(completeness.missing, [
    'Tax ID last four',
    'Authorization contact name',
    'Authorization contact role',
    'Authorization contact email',
  ])
})

test('campaign completion snapshot preserves organization values at close', () => {
  const snapshot = buildOrganizationComplianceSnapshot({
    organizationName: 'Westside PTO',
    organizationType: 'pta_pto',
    townName: 'Lubbock',
    stateCode: 'tx',
    complianceProfile: {
      legalEntityName: 'Westside Parent Teacher Organization',
      taxIdLast4: '6789',
      taxExemptStatus: 'organization_reported_exempt',
      authorizationStatus: 'school_confirmed',
      authorizationContactName: 'Alex Sponsor',
      authorizationContactRole: 'Principal',
      authorizationContactEmail: 'principal@example.org',
    },
    capturedAt: '2026-09-20T02:30:00.000Z',
  })

  assert.equal(snapshot.organizationName, 'Westside PTO')
  assert.equal(snapshot.organizationType, 'pta_pto')
  assert.equal(snapshot.stateCode, 'TX')
  assert.equal(snapshot.taxIdLast4, '6789')
  assert.equal(snapshot.capturedAt, '2026-09-20T02:30:00.000Z')
})
