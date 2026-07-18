import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export type OwnerCampaignPricingHistoryEnvironment =
  | 'production'
  | 'demo'

export type OwnerCampaignPricingHistoryItem = {
  id: string
  campaignId: string
  campaignName: string
  environment: OwnerCampaignPricingHistoryEnvironment
  passPrice: number
  platformFeePercent: number
  platformFeeAmount: number
  organizationPassEarnings: number
  status: 'active' | 'inactive'
  startsAt: string
  expiresAt: string | null
  reason: string | null
  internalNote: string | null
  createdAt: string
  createdByUserId: string | null
}

export type OwnerCampaignPricingHistoryResult =
  | {
      status: 'success'
      history: OwnerCampaignPricingHistoryItem[]
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

type CampaignPricingHistoryRow = {
  id: string
  campaign_id: string | null
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

type CampaignNameRow = {
  id: string
  name: string
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_HISTORY_LIMIT = 20
const MAX_HISTORY_LIMIT = 100

// =============================================================================
// Helpers
// =============================================================================

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
    Math.max(1, Math.floor(limit ?? DEFAULT_HISTORY_LIMIT))
  )
}

function mapHistoryItem(
  row: CampaignPricingHistoryRow & {
    campaign_id: string
  },
  campaignName: string
): OwnerCampaignPricingHistoryItem {
  const passPrice = normalizeMoney(row.pass_price)

  const platformFeePercent = normalizeMoney(
    row.platform_fee_percent
  )

  const platformFeeAmount = normalizeMoney(
    passPrice * (platformFeePercent / 100)
  )

  return {
    id: row.id,
    campaignId: row.campaign_id,
    campaignName,
    environment: row.is_demo
      ? 'demo'
      : 'production',
    passPrice,
    platformFeePercent,
    platformFeeAmount,
    organizationPassEarnings: normalizeMoney(
      passPrice - platformFeeAmount
    ),
    status:
      row.status === 'active'
        ? 'active'
        : 'inactive',
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    reason: row.reason,
    internalNote: row.internal_note,
    createdAt: row.created_at,
    createdByUserId: row.created_by,
  }
}

// =============================================================================
// Service
// =============================================================================

export async function getOwnerCampaignPricingHistory(
  limit?: number
): Promise<OwnerCampaignPricingHistoryResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: 'unauthenticated',
      message:
        'Sign in to view campaign pricing history.',
    }
  }

  const { data: profile, error: profileError } =
    await supabase
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

  const { data: historyData, error: historyError } =
    await admin
      .from('pricing_rules')
      .select(
        `
          id,
          campaign_id,
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
      .eq('scope_type', 'campaign')
      .order('starts_at', {
        ascending: false,
      })
      .order('created_at', {
        ascending: false,
      })
      .limit(normalizeLimit(limit))
      .returns<CampaignPricingHistoryRow[]>()

  if (historyError) {
    return {
      status: 'lookup-failure',
      message:
        'Unable to load campaign pricing history.',
    }
  }

  const rows = (historyData ?? []).filter(
    (
      row
    ): row is CampaignPricingHistoryRow & {
      campaign_id: string
    } => Boolean(row.campaign_id)
  )

  const campaignIds = [
    ...new Set(
      rows.map((row) => row.campaign_id)
    ),
  ]

  if (campaignIds.length === 0) {
    return {
      status: 'success',
      history: [],
    }
  }

  const { data: campaignData, error: campaignError } =
    await admin
      .from('campaigns')
      .select('id, name')
      .in('id', campaignIds)
      .returns<CampaignNameRow[]>()

  if (campaignError) {
    return {
      status: 'lookup-failure',
      message:
        'Unable to load campaign names for pricing history.',
    }
  }

  const campaignNameById = new Map(
    (campaignData ?? []).map((campaign) => [
      campaign.id,
      campaign.name,
    ])
  )

  return {
    status: 'success',
    history: rows.map((row) =>
      mapHistoryItem(
        row,
        campaignNameById.get(row.campaign_id) ??
          'Unknown campaign'
      )
    ),
  }
}
