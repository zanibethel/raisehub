import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type OwnerStatePricingHistoryEnvironment =
  | 'production'
  | 'demo'

export type OwnerStatePricingHistoryItem = {
  id: string
  stateCode: string
  environment: OwnerStatePricingHistoryEnvironment
  passPrice: number
  platformFeePercent: number
  platformFeeAmount: number
  organizationPassEarnings: number
  status:
    | 'active'
    | 'scheduled'
    | 'expired'
    | 'inactive'
  startsAt: string
  expiresAt: string | null
  reason: string | null
  internalNote: string | null
  createdAt: string
  createdByUserId: string | null
}

export type OwnerStatePricingHistoryResult =
  | {
      status: 'success'
      history: OwnerStatePricingHistoryItem[]
    }
  | {
      status: 'unauthenticated'
      message: string
    }
  | {
      status: 'owner-role-required'
      message: string
    }
  | {
      status: 'lookup-failure'
      message: string
    }

type ActorProfile = {
  role: string
}

type StatePricingHistoryRow = {
  id: string
  state_code: string | null
  pass_price: number
  platform_fee_percent: number
  status: string
  starts_at: string
  expires_at: string | null
  reason: string | null
  internal_note: string | null
  is_demo: boolean
  created_at: string
  created_by: string | null
}

const DEFAULT_HISTORY_LIMIT = 20
const MAX_HISTORY_LIMIT = 100

function normalizeMoney(value: number) {
  const normalized = Number(value)

  if (!Number.isFinite(normalized)) {
    return 0
  }

  return Math.round(normalized * 100) / 100
}

function normalizeLimit(limit?: number) {
  if (!Number.isFinite(limit)) {
    return DEFAULT_HISTORY_LIMIT
  }

  return Math.min(
    MAX_HISTORY_LIMIT,
    Math.max(
      1,
      Math.floor(
        limit ?? DEFAULT_HISTORY_LIMIT
      )
    )
  )
}

function normalizeStateCode(
  value: string | null
): string | null {
  const normalized =
    value?.trim().toUpperCase() ?? null

  if (
    !normalized ||
    !/^[A-Z]{2}$/.test(normalized)
  ) {
    return null
  }

  return normalized
}

function mapHistoryItem(
  row: StatePricingHistoryRow & {
    state_code: string
  }
): OwnerStatePricingHistoryItem {
  const passPrice = normalizeMoney(
    row.pass_price
  )

  const platformFeePercent = normalizeMoney(
    row.platform_fee_percent
  )

  const platformFeeAmount = normalizeMoney(
    passPrice * (platformFeePercent / 100)
  )

  return {
    id: row.id,
    stateCode: row.state_code,
    environment: row.is_demo
      ? 'demo'
      : 'production',
    passPrice,
    platformFeePercent,
    platformFeeAmount,
    organizationPassEarnings:
      normalizeMoney(
        passPrice - platformFeeAmount
      ),
    status: (() => {
      if (row.status !== 'active') {
        return 'inactive'
      }

      const now = new Date()
      const startsAt = new Date(
        row.starts_at
      )

      const expiresAt = row.expires_at
        ? new Date(row.expires_at)
        : null

      if (startsAt > now) {
        return 'scheduled'
      }

      if (
        expiresAt &&
        expiresAt <= now
      ) {
        return 'expired'
      }

      return 'active'
    })(),
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    reason: row.reason,
    internalNote: row.internal_note,
    createdAt: row.created_at,
    createdByUserId: row.created_by,
  }
}

export async function getOwnerStatePricingHistory(
  limit?: number
): Promise<OwnerStatePricingHistoryResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: 'unauthenticated',
      message:
        'Sign in to view state pricing history.',
    }
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<ActorProfile>()

  if (profileError || !profile) {
    return {
      status: 'lookup-failure',
      message:
        'Unable to verify owner access.',
    }
  }

  if (profile.role !== 'owner') {
    return {
      status: 'owner-role-required',
      message:
        'Owner access is required.',
    }
  }

  const admin = createAdminClient()

  const {
    data: historyData,
    error: historyError,
  } = await admin
    .from('pricing_rules')
    .select(
      `
        id,
        state_code,
        pass_price,
        platform_fee_percent,
        status,
        starts_at,
        expires_at,
        reason,
        internal_note,
        is_demo,
        created_at,
        created_by
      `
    )
    .eq('scope_type', 'state')
    .order('starts_at', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })
    .limit(normalizeLimit(limit))
    .returns<StatePricingHistoryRow[]>()

  if (historyError) {
    return {
      status: 'lookup-failure',
      message:
        'Unable to load state pricing history.',
    }
  }

  const rows = (
    historyData ?? []
  ).flatMap((row) => {
    const stateCode = normalizeStateCode(
      row.state_code
    )

    if (!stateCode) {
      return []
    }

    return [
      {
        ...row,
        state_code: stateCode,
      },
    ]
  })

  return {
    status: 'success',
    history: rows.map(mapHistoryItem),
  }
}