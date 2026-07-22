import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/app/components/campaign-card.tsx'
  ),
  'utf8'
)

test('campaign cards display resolved pass pricing when available', () => {
  assert.match(source, /function getPassPrice/)
  assert.match(source, /RaiseHub Pass/)
  assert.match(source, /Optional donation can be added at checkout\./)
  assert.match(source, /minimumFractionDigits: 2/)
})

test('campaign cards keep demo samples without pricing valid', () => {
  assert.match(source, /if \(!\('passPrice' in campaign\)\)/)
  assert.match(source, /return null/)
})
