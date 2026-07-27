// =========================================
// 🧭 APP MODE STRATEGY
// Determines whether the app is running as the
// demo showroom or the normal production experience.
//
// NEXT_PUBLIC_APP_MODE remains the long-term deployment
// control. The dedicated Sprint #41 preview branch also
// opts into demo mode so the interactive demo can be
// reviewed before a permanent demo deployment is created.
//
// Production and unrelated preview branches still default
// to production mode.
// =========================================

export type AppMode = 'demo' | 'production'

const DEMO_PREVIEW_BRANCH =
  'agent/sprint-41-interactive-demo'

export function getAppMode(): AppMode {
  const configuredMode =
    process.env.NEXT_PUBLIC_APP_MODE
  const deploymentBranch =
    process.env.VERCEL_GIT_COMMIT_REF

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
