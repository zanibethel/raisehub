import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dashboardSource = readFileSync(
  new URL('./business-dashboard-content.tsx', import.meta.url),
  'utf8'
)

test('imports the business redemption settings section', () => {
  assert.match(
    dashboardSource,
    /import BusinessRedemptionSettingsSection from '\.\/sections\/business-redemption-settings-section'/
  )
})

test('supports an optional business profile redemption method', () => {
  assert.match(dashboardSource, /redemption_method\?: string \| null/)
})

test('renders the redemption settings section on the business dashboard', () => {
  assert.match(dashboardSource, /id="business-redemption-settings"/)
  assert.match(dashboardSource, /<BusinessRedemptionSettingsSection/)
})

test('passes the profile redemption method into the settings section', () => {
  assert.match(
    dashboardSource,
    /redemptionMethod=\{\s*profile\?\.redemption_method\s*\}/
  )
})

test('places redemption settings after quick actions and before offer creation', () => {
  const quickActionsIndex = dashboardSource.indexOf('<BusinessDashboardQuickActions')
  const redemptionSettingsIndex = dashboardSource.indexOf(
    'id="business-redemption-settings"'
  )
  const createOfferIndex = dashboardSource.indexOf('id="create-offer"')

  assert.notEqual(quickActionsIndex, -1)
  assert.notEqual(redemptionSettingsIndex, -1)
  assert.notEqual(createOfferIndex, -1)
  assert.equal(quickActionsIndex < redemptionSettingsIndex, true)
  assert.equal(redemptionSettingsIndex < createOfferIndex, true)
})

test('does not add redemption save behavior to the dashboard wrapper', () => {
  const redemptionSectionStart = dashboardSource.indexOf(
    'id="business-redemption-settings"'
  )
  const createOfferSectionStart = dashboardSource.indexOf('id="create-offer"')

  assert.notEqual(redemptionSectionStart, -1)
  assert.notEqual(createOfferSectionStart, -1)

  const redemptionSectionSource = dashboardSource.slice(
    redemptionSectionStart,
    createOfferSectionStart
  )

  assert.doesNotMatch(redemptionSectionSource, /<button/i)
  assert.doesNotMatch(redemptionSectionSource, /<form/i)
  assert.doesNotMatch(redemptionSectionSource, /onSubmit=/)
  assert.doesNotMatch(redemptionSectionSource, /supabase/i)
})

test('keeps the redemption settings wrapper isolated from upgrade state', () => {
  const redemptionSectionStart = dashboardSource.indexOf(
    'id="business-redemption-settings"'
  )
  const createOfferSectionStart = dashboardSource.indexOf('id="create-offer"')

  assert.notEqual(redemptionSectionStart, -1)
  assert.notEqual(createOfferSectionStart, -1)

  const redemptionSectionSource = dashboardSource.slice(
    redemptionSectionStart,
    createOfferSectionStart
  )

  assert.doesNotMatch(redemptionSectionSource, /setIsUpgradeOpen/)
  assert.doesNotMatch(redemptionSectionSource, /isUpgradeOpen/)
})

test('masks supporter email addresses in redemption reporting and exports', () => {
  assert.match(dashboardSource, /function maskCustomerEmail/)
  assert.match(
    dashboardSource,
    /customerEmail: maskCustomerEmail\(profileEmailById\[redemption\.user_id\]\)/
  )
  assert.match(
    dashboardSource,
    /maskCustomerEmail\(profileEmailById\[redemption\.user_id\]\)/
  )
  assert.match(dashboardSource, /Supporter identifiers are privacy-masked\./)
})

test('provides status, offer, and date filters for redemption records', () => {
  assert.match(dashboardSource, /redemptionStatusFilter/)
  assert.match(dashboardSource, /redemptionOfferFilter/)
  assert.match(dashboardSource, /redemptionDateFilter/)
  assert.match(dashboardSource, /<option value="7d">Last 7 days<\/option>/)
  assert.match(dashboardSource, /<option value="30d">Last 30 days<\/option>/)
  assert.match(dashboardSource, /<option value="90d">Last 90 days<\/option>/)
})

test('exports the same filtered redemption records shown in the report', () => {
  assert.match(
    dashboardSource,
    /redemptionActivity: filteredRedemptionActivity/
  )
  assert.match(
    dashboardSource,
    /filteredRedemptionActivity\.slice\(0, 12\)/
  )
})
