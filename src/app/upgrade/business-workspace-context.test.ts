import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const contextSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/upgrade/business-workspace-context.tsx'),
  'utf8'
)
const pageSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/upgrade/page.tsx'),
  'utf8'
)

test('upgrade page aligns the saved workspace with the Business being billed', () => {
  assert.match(pageSource, /businessWorkspaceKey = `business:\$\{business\.id\}`/)
  assert.match(pageSource, /BusinessWorkspaceContext workspaceKey=\{businessWorkspaceKey\}/)
  assert.match(contextSource, /raisehub-selected-workspace/)
  assert.match(contextSource, /router\.refresh\(\)/)
})

test('upgrade back link targets the same Business workspace explicitly', () => {
  assert.match(pageSource, /dashboard\?workspace=/)
  assert.match(pageSource, /href=\{businessDashboardHref\}/)
})
