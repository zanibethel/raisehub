import type { AppMode } from '@/lib/app-mode'

export type WorkspaceEnvironment = {
  mode: AppMode
  label: 'Live workspace' | 'Demo workspace'
  usesSampleData: boolean
  allowsRealPayments: boolean
}

/**
 * Workspace presentation is intentionally shared between Live and Demo.
 * Environment changes data and action safety, never the component tree.
 */
export function resolveWorkspaceEnvironment(mode: AppMode): WorkspaceEnvironment {
  if (mode === 'demo') {
    return {
      mode,
      label: 'Demo workspace',
      usesSampleData: true,
      allowsRealPayments: false,
    }
  }

  return {
    mode,
    label: 'Live workspace',
    usesSampleData: false,
    allowsRealPayments: true,
  }
}
