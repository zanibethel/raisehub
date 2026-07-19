import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type OwnerOrganizationPricingHistoryEnvironment =
  | 'production'
  | 'demo'

export type OwnerOrganizationPricingHistoryItem = {
  id: string
  organizationId: string
  organizationName: string
  environment: OwnerOrganizationPricingHistoryEnvironment
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

export type OwnerOrganizationPricingHistoryResult =
  | {
      status: 'success'
      history: OwnerOrganizationPricingHistoryItem[]
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

type OrganizationPricingHistoryRow = {
  id: string
  organization_id: string | null
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

type OrganizationNameRow = {
  id: string
  name: string
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

function mapHistoryItem(
  row: OrganizationPricingHistoryRow & {
    organization_id: string
  },
  organizationName: string
): OwnerOrganizationPricingHistoryItem {
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
    organizationId: row.organization_id,
    organizationName,
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

export async function getOwnerOrganizationPricingHistory(
  limit?: number
): Promise<OwnerOrganizationPricingHistoryResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: 'unauthenticated',
      message:
        'Sign in to view organization pricing history.',
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
        organization_id,
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
    .eq('scope_type', 'organization')
    .order('starts_at', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })
    .limit(normalizeLimit(limit))
    .returns<
      OrganizationPricingHistoryRow[]
    >()

  if (historyError) {
    return {
      status: 'lookup-failure',
      message:
        'Unable to load organization pricing history.',
    }
  }

  const rows = (
    historyData ?? []
  ).filter(
    (
      row
    ): row is OrganizationPricingHistoryRow & {
      organization_id: string
    } => Boolean(row.organization_id)
  )

  const organizationIds = [
    ...new Set(
      rows.map(
        (row) => row.organization_id
      )
    ),
  ]

  if (organizationIds.length === 0) {
    return {
      status: 'success',
      history: [],
    }
  }

  const {
    data: organizationData,
    error: organizationError,
  } = await admin
    .from('organizations')
    .select('id, name')
    .in('id', organizationIds)
    .returns<OrganizationNameRow[]>()

  if (organizationError) {
    return {
      status: 'lookup-failure',
      message:
        'Unable to load organization names for pricing history.',
    }
  }

  const organizationNameById =
    new Map(
      (organizationData ?? []).map(
        (organization) => [
          organization.id,
          organization.name,
        ]
      )
    )

  return {
    status: 'success',
    history: rows.map((row) =>
      mapHistoryItem(
        row,
        organizationNameById.get(
          row.organization_id
        ) ?? 'Unknown organization'
      )
    ),
  }
}
