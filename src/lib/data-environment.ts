import type { AppMode } from '@/lib/app-mode'

export type DataEnvironment =
  | { mode: 'production'; demoGroup: null }
  | { mode: 'demo'; demoGroup: string }

export type EnvironmentOwnedRecord = {
  is_demo?: boolean | null
  demo_group?: string | null
}

export function resolveDataEnvironment(
  mode: AppMode,
  demoGroup?: string | null
): DataEnvironment {
  if (mode === 'production') {
    return { mode: 'production', demoGroup: null }
  }

  const normalizedGroup = demoGroup?.trim()
  if (!normalizedGroup) {
    throw new Error('Demo data access requires an explicit demo group.')
  }

  return { mode: 'demo', demoGroup: normalizedGroup }
}

export function recordMatchesEnvironment(
  record: EnvironmentOwnedRecord,
  environment: DataEnvironment
): boolean {
  const isDemo = record.is_demo === true
  const demoGroup = record.demo_group?.trim() || null

  if (environment.mode === 'production') {
    return !isDemo && demoGroup === null
  }

  return isDemo && demoGroup === environment.demoGroup
}

export function requireRecordEnvironment<T extends EnvironmentOwnedRecord>(
  record: T | null | undefined,
  environment: DataEnvironment
): T {
  if (!record || !recordMatchesEnvironment(record, environment)) {
    throw new Error('Record is unavailable in the active data environment.')
  }

  return record
}

export function applyEnvironmentScope<
  T extends {
    eq(column: string, value: unknown): T
    is(column: string, value: null): T
  },
>(query: T, environment: DataEnvironment): T {
  if (environment.mode === 'production') {
    return query.eq('is_demo', false).is('demo_group', null)
  }

  return query.eq('is_demo', true).eq('demo_group', environment.demoGroup)
}
