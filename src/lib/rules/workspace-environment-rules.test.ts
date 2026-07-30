import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveWorkspaceEnvironment } from './workspace-environment-rules'

test('Live and Demo share presentation while preserving environment safety', () => {
  const live = resolveWorkspaceEnvironment('production')
  const demo = resolveWorkspaceEnvironment('demo')

  assert.equal(live.label, 'Live workspace')
  assert.equal(live.usesSampleData, false)
  assert.equal(live.allowsRealPayments, true)

  assert.equal(demo.label, 'Demo workspace')
  assert.equal(demo.usesSampleData, true)
  assert.equal(demo.allowsRealPayments, false)

  assert.deepEqual(Object.keys(live).sort(), Object.keys(demo).sort())
})
