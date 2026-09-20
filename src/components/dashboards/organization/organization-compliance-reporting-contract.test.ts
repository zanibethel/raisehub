import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const profileSource = readFileSync(
  new URL('./sections/organization-profile-setup-section.tsx', import.meta.url),
  'utf8'
)

const campaignActionsSource = readFileSync(
  new URL('../../../app/organization/actions.ts', import.meta.url),
  'utf8'
)

const reportSource = readFileSync(
  new URL('./sections/organization-top-sellers-section.tsx', import.meta.url),
  'utf8'
)

test('optional compliance details are presented as nonblocking guidance', () => {
  assert.match(profileSource, /Optional compliance &amp; reporting details/)
  assert.match(profileSource, /Does not block creation or promotion/)
  assert.match(profileSource, /missing values will not stop you from creating, sharing, or promoting a fundraiser/)
})

test('campaign creation readiness stays limited to basic organization identity and location', () => {
  const setupFunction = campaignActionsSource.slice(
    campaignActionsSource.indexOf('function organizationSetupIsComplete'),
    campaignActionsSource.indexOf('async function getAuthorizedCampaign')
  )

  assert.match(setupFunction, /organization\.name/)
  assert.match(setupFunction, /organization\.town_name/)
  assert.match(setupFunction, /organization\.state_code/)
  assert.doesNotMatch(setupFunction, /compliance_profile/)
  assert.doesNotMatch(setupFunction, /tax/)
  assert.doesNotMatch(setupFunction, /authorization/)
})

test('completed campaigns snapshot available organization values for historical reports', () => {
  assert.match(campaignActionsSource, /status === 'completed'/)
  assert.match(campaignActionsSource, /buildOrganizationComplianceSnapshot/)
  assert.match(campaignActionsSource, /completion_snapshot: completionSnapshot/)
  assert.match(campaignActionsSource, /completed_at: completedAt/)
})

test('campaign reports mask tax identifiers and label missing values as nonfatal', () => {
  assert.match(reportSource, /maskTaxIdLast4/)
  assert.match(reportSource, /Snapshot from campaign close/)
  assert.match(reportSource, /Missing values are shown/)
  assert.match(reportSource, /do not make the campaign report incomplete/)
})
