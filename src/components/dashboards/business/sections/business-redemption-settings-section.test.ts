import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  getBusinessRedemptionSettings,
} from '@/lib/redemptions/business-redemption-settings'

const componentSource = readFileSync(
  new URL('./business-redemption-settings-section.tsx', import.meta.url),
  'utf8'
)

test('declares the settings section as a client component', () => {
  assert.match(componentSource, /^'use client'/)
})

test('exports the business redemption settings section', () => {
  assert.match(componentSource, /export function BusinessRedemptionSettingsSection/)
  assert.match(componentSource, /export default BusinessRedemptionSettingsSection/)
})

test('accepts an optional redemption method and resolves settings', () => {
  assert.match(componentSource, /redemptionMethod\?: unknown/)
  assert.match(
    componentSource,
    /getBusinessRedemptionSettings\(redemptionMethod\)/
  )
})

test('uses an accessible section heading and expandable control', () => {
  assert.match(componentSource, /aria-labelledby="business-redemption-settings-heading"/)
  assert.match(componentSource, /id="business-redemption-settings-heading"/)
  assert.match(componentSource, /aria-expanded=\{expanded\}/)
})

test('presents auto validation as the persisted core workflow', () => {
  const settings = getBusinessRedemptionSettings(undefined)

  assert.equal(settings.selectedMethod, 'auto_validation')
  assert.equal(
    settings.options.find(({ isSelected }) => isSelected)?.value,
    'auto_validation'
  )
  assert.equal(
    settings.options.find(({ value }) => value === 'auto_validation')?.statusLabel,
    'Current Workflow'
  )
})

test('presents manual code and QR verification as live optional tools', () => {
  const settings = getBusinessRedemptionSettings(undefined)

  for (const method of ['staff_confirmation', 'qr_code']) {
    const option = settings.options.find(({ value }) => value === method)
    assert.equal(option?.isSelectable, false)
    assert.equal(option?.statusLabel, 'Optional Tool')
  }

  assert.match(componentSource, /Live now\./)
  assert.match(componentSource, /phone camera/i)
})

test('keeps POS discount code and Square as planned integrations', () => {
  const settings = getBusinessRedemptionSettings(undefined)

  for (const method of ['staff_code', 'square']) {
    const option = settings.options.find(({ value }) => value === method)
    assert.equal(option?.isSelectable, false)
    assert.equal(option?.statusLabel, 'Coming Later')
  }

  assert.match(componentSource, /This integration is planned and cannot be selected yet\./)
})

test('renders a save button only for selectable persisted workflows', () => {
  assert.match(componentSource, /option\.isSelectable \? \(/)
  assert.match(componentSource, /Use this workflow/)
  assert.match(componentSource, /handleSelect\(option\.value\)/)
})

test('uses the protected redemption settings action and transition', () => {
  assert.match(componentSource, /updateBusinessRedemptionMethodAction/)
  assert.match(componentSource, /startTransition\(async \(\) =>/)
  assert.match(componentSource, /setSelectedMethod\(result\.redemptionMethod\)/)
  assert.match(componentSource, /Saving…/)
})

test('shows success and error feedback with accessible roles', () => {
  assert.match(componentSource, /type: 'error'/)
  assert.match(componentSource, /text: result\.error/)
  assert.match(componentSource, /type: 'success'/)
  assert.match(componentSource, /Your redemption workflow has been updated\./)
  assert.match(
    componentSource,
    /saveMessage\.type === 'error' \? 'alert' : 'status'/
  )
})

test('does not write directly to Supabase from the client section', () => {
  assert.doesNotMatch(componentSource, /createClient/)
  assert.doesNotMatch(componentSource, /\.from\('profiles'\)/)
  assert.doesNotMatch(componentSource, /\.update\(/)
})
