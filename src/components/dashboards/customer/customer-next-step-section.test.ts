import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const nextStepSource = readFileSync(
  new URL(
    './sections/customer-next-step-section.tsx',
    import.meta.url
  ),
  'utf8'
)

const dashboardSource = readFileSync(
  new URL(
    './customer-dashboard-content.tsx',
    import.meta.url
  ),
  'utf8'
)

test(
  'covers every major customer next-step state',
  () => {
    assert.ok(
      nextStepSource.includes(
        'if (!hasActivePass)'
      )
    )

    assert.ok(
      nextStepSource.includes(
        'if (readyToUseDealCount > 0)'
      )
    )

    assert.ok(
      nextStepSource.includes(
        'if (availableOfferCount > 0)'
      )
    )

    assert.ok(
      nextStepSource.includes(
        "title: 'Your pass is active'"
      )
    )
  }
)

test(
  'provides direct destinations for each next step',
  () => {
    assert.ok(
      nextStepSource.includes(
        "actionHref: '/campaigns'"
      )
    )

    assert.ok(
      nextStepSource.includes(
        "actionHref: '#my-pass'"
      )
    )

    assert.ok(
      nextStepSource.includes(
        "actionHref: '#available-offers'"
      )
    )

    assert.ok(
      nextStepSource.includes(
        "actionHref: '#customer-updates'"
      )
    )
  }
)

test(
  'keeps the guidance accessible and mobile friendly',
  () => {
    assert.ok(
      nextStepSource.includes(
        'aria-labelledby="customer-next-step-heading"'
      )
    )

    assert.ok(
      nextStepSource.includes(
        'min-h-12 w-full'
      )
    )

    assert.ok(
      nextStepSource.includes(
        'sm:w-auto'
      )
    )
  }
)

test(
  'wires live dashboard counts into next-step guidance',
  () => {
    assert.ok(
      dashboardSource.includes(
        '<CustomerNextStepSection'
      )
    )

    assert.ok(
      dashboardSource.includes(
        'availableOfferCount={'
      )
    )

    assert.ok(
      dashboardSource.includes(
        'savedDealCount={'
      )
    )

    assert.ok(
      dashboardSource.includes(
        'readyToUseDealCount={'
      )
    )

    assert.ok(
      dashboardSource.includes(
        'purchaseCount={'
      )
    )
  }
)
