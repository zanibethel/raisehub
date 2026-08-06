import { getAppMode, type AppMode } from '@/lib/app-mode'

export type DataEnvironment =
  | { mode: 'production'; demoGroup: null }
  | { mode: 'demo'; demoGroup: string }

export type RpcEnvironmentExpectation = {
  p_expected_environment_mode: DataEnvironment['mode']
  p_expected_demo_group: string | null
}

export type EnvironmentOwnedRecord = {
  is_demo?: boolean | null
  demo_group?: string | null
}

const DEFAULT_DEMO_GROUP = 'lakeview_launch_2026'

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

export function getActiveDataEnvironment(
  demoGroup = process.env.RAISEHUB_DEMO_GROUP ??
    process.env.NEXT_PUBLIC_DEMO_GROUP ??
    DEFAULT_DEMO_GROUP
): DataEnvironment {
  return resolveDataEnvironment(getAppMode(), demoGroup)
}

export function toRpcEnvironmentExpectation(
  environment: DataEnvironment
): RpcEnvironmentExpectation {
  return {
    p_expected_environment_mode: environment.mode,
    p_expected_demo_group:
      environment.mode === 'demo'
        ? environment.demoGroup
        : null,
  }
}

export function isMissingEnvironmentAwareRpc(
  error: { message?: string | null } | null,
  functionName: string
): boolean {
  const message = error?.message?.toLowerCase() ?? ''
  const normalizedFunctionName = functionName.toLowerCase()
  return (
    message.includes(normalizedFunctionName) &&
    (message.includes('schema cache') ||
      message.includes('does not exist') ||
      message.includes('could not find the function'))
  )
}

export function recordMatchesEnvironment(
  record: EnvironmentOwnedRecord,
  environment: DataEnvironment
): boolean {
  const demoGroup = record.demo_group?.trim() || null

  if (environment.mode === 'production') {
    return record.is_demo === false && demoGroup === null
  }

  return record.is_demo === true && demoGroup === environment.demoGroup
}

export function recordsShareEnvironment(
  left: EnvironmentOwnedRecord,
  right: EnvironmentOwnedRecord
): boolean {
  const leftGroup = left.demo_group?.trim() || null
  const rightGroup = right.demo_group?.trim() || null

  return left.is_demo === right.is_demo && leftGroup === rightGroup
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

export function requireRelatedRecordEnvironment<
  TParent extends EnvironmentOwnedRecord,
  TChild extends EnvironmentOwnedRecord,
>(
  parent: TParent | null | undefined,
  child: TChild | null | undefined,
  environment: DataEnvironment
): { parent: TParent; child: TChild } {
  const scopedParent = requireRecordEnvironment(parent, environment)
  const scopedChild = requireRecordEnvironment(child, environment)

  if (!recordsShareEnvironment(scopedParent, scopedChild)) {
    throw new Error('Related records cross data environments.')
  }

  return { parent: scopedParent, child: scopedChild }
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
