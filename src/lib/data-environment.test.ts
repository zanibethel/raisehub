import assert from 'node:assert/strict'
import test from 'node:test'

import {
  recordMatchesEnvironment,
  requireRecordEnvironment,
  resolveDataEnvironment,
} from './data-environment'

test('production accepts only explicit live records', () => {
  const environment = resolveDataEnvironment('production')

  assert.equal(
    recordMatchesEnvironment({ is_demo: false, demo_group: null }, environment),
    true
  )
  assert.equal(
    recordMatchesEnvironment({ is_demo: true, demo_group: 'lakeview_launch_2026' }, environment),
    false
  )
  assert.equal(
    recordMatchesEnvironment({ is_demo: false, demo_group: 'lakeview_launch_2026' }, environment),
    false
  )
})

test('demo access requires an explicit group', () => {
  assert.throws(
    () => resolveDataEnvironment('demo'),
    /requires an explicit demo group/
  )
})

test('demo groups cannot see each other', () => {
  const lakeview = resolveDataEnvironment('demo', 'lakeview_launch_2026')
  const custom = resolveDataEnvironment('demo', 'custom_group_a')
  const lakeviewOffer = {
    is_demo: true,
    demo_group: 'lakeview_launch_2026',
  }

  assert.equal(recordMatchesEnvironment(lakeviewOffer, lakeview), true)
  assert.equal(recordMatchesEnvironment(lakeviewOffer, custom), false)
})

test('missing or ambiguous metadata fails closed', () => {
  const production = resolveDataEnvironment('production')
  const lakeview = resolveDataEnvironment('demo', 'lakeview_launch_2026')

  assert.equal(recordMatchesEnvironment({}, production), false)
  assert.equal(recordMatchesEnvironment({ is_demo: true }, lakeview), false)
  assert.throws(
    () => requireRecordEnvironment({ is_demo: true, demo_group: null }, lakeview),
    /unavailable in the active data environment/
  )
})
