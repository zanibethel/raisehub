// =========================================
// 🧭 APP MODE STRATEGY
// Determines whether the app is running as the
// demo showroom (demo.raisehub.com) or production
// (raisehub.com).
//
// Controlled by NEXT_PUBLIC_APP_MODE, set per
// Vercel deployment. Defaults to 'production' so
// that any environment without this variable set
// behaves exactly as it does today — no behavior
// change until a deployment explicitly opts into
// demo mode.
// =========================================

export type AppMode = 'demo' | 'production'

export function getAppMode(): AppMode {
  const value = process.env.NEXT_PUBLIC_APP_MODE

  if (value === 'demo') {
    return 'demo'
  }

  return 'production'
}

export function isDemoMode(): boolean {
  return getAppMode() === 'demo'
}
