// =========================================
// 🧭 APP MODE STRATEGY
//
// The two Vercel projects are the durable boundary:
// - raisehub.app is always production
// - demo.raisehub.app is always demo
//
// NEXT_PUBLIC_APP_MODE remains the local/development fallback. Project identity
// takes precedence so an accidentally copied environment variable cannot make
// the Live domain render Demo messaging or expose the wrong experience.
// =========================================

export type AppMode = 'demo' | 'production'

const DEMO_PREVIEW_BRANCH = 'agent/sprint-41-interactive-demo'

function getDeploymentMode(): AppMode | null {
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.toLowerCase()

  if (!productionUrl) {
    return null
  }

  if (
    productionUrl === 'demo.raisehub.app' ||
    productionUrl.includes('raisehub-demo')
  ) {
    return 'demo'
  }

  if (
    productionUrl === 'raisehub.app' ||
    productionUrl === 'www.raisehub.app' ||
    productionUrl.includes('raisehub.vercel.app') ||
    productionUrl.startsWith('raisehub-')
  ) {
    return 'production'
  }

  return null
}

export function getAppMode(): AppMode {
  const deploymentMode = getDeploymentMode()

  if (deploymentMode) {
    return deploymentMode
  }

  const configuredMode = process.env.NEXT_PUBLIC_APP_MODE
  const deploymentBranch = process.env.VERCEL_GIT_COMMIT_REF

  if (
    configuredMode === 'demo' ||
    deploymentBranch === DEMO_PREVIEW_BRANCH
  ) {
    return 'demo'
  }

  return 'production'
}

export function isDemoMode(): boolean {
  return getAppMode() === 'demo'
}
