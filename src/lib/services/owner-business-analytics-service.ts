import type { WorkspaceCardData, WorkspaceRole } from '@/lib/types/identity-access'
import { getBusinessOffers } from '@/lib/repositories/business-offer-repository'
import {
  authorizeOwnerWorkspaceRead,
  type OwnerWorkspaceAuthorizationFailureReason,
} from '@/lib/services/owner-workspace-authorization-service'
import { createAdminClient } from '@/lib/supabase/admin'

export type ReadOnlyBusinessOfferAnalytics = {
  offerId: string
  title: string
  views: number
  clicks: number
  saves: number
  confirmedRedemptions: number
  conversionRate: number | null
}

export type OwnerBusinessAnalyticsResult =
  | {
      success: true
      workspace: WorkspaceCardData
      offers: ReadOnlyBusinessOfferAnalytics[]
      summary: {
        views: number
        clicks: number
        saves: number
        confirmedRedemptions: number
        conversionRate: number | null
      }
    }
  | {
      success: false
      reason:
        | OwnerWorkspaceAuthorizationFailureReason
        | 'invalid-workspace-role'
        | 'offer-lookup-failure'
        | 'business-lookup-failure'
        | 'analytics-lookup-failure'
      message: string
    }

type EventRow = { offer_id: string }
type CanonicalBusiness = {
  is_demo: boolean | null
  demo_group: string | null
}

function countByOffer(rows: EventRow[]) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.offer_id, (counts.get(row.offer_id) ?? 0) + 1)
  }
  return counts
}

function rate(redemptions: number, views: number) {
  if (views <= 0) return null
  return redemptions / views
}

export async function getOwnerAuthorizedBusinessAnalytics(
  workspaceId: string,
  workspaceRole: WorkspaceRole
): Promise<OwnerBusinessAnalyticsResult> {
  if (workspaceRole !== 'business') {
    return {
      success: false,
      reason: 'invalid-workspace-role',
      message: 'Business analytics are only available for business workspaces.',
    }
  }

  const authorizationResult = await authorizeOwnerWorkspaceRead(workspaceId, workspaceRole)
  if (!authorizationResult.authorized) {
    return {
      success: false,
      reason: authorizationResult.reason,
      message: authorizationResult.message,
    }
  }

  const { offers, error: offerError } = await getBusinessOffers(workspaceId)
  if (offerError) {
    return {
      success: false,
      reason: 'offer-lookup-failure',
      message: 'Unable to load business offers for analytics.',
    }
  }

  const offerIds = offers.map((offer) => offer.id)
  if (offerIds.length === 0) {
    return {
      success: true,
      workspace: authorizationResult.workspace,
      offers: [],
      summary: { views: 0, clicks: 0, saves: 0, confirmedRedemptions: 0, conversionRate: null },
    }
  }

  const admin = createAdminClient() as any
  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('is_demo,demo_group')
    .eq('id', workspaceId)
    .maybeSingle()

  if (businessError || !business) {
    return {
      success: false,
      reason: 'business-lookup-failure',
      message: 'Unable to resolve the business environment for analytics.',
    }
  }

  const typedBusiness = business as CanonicalBusiness
  const applyEnvironment = (query: any) => {
    if (typedBusiness.is_demo) {
      query = query.eq('is_demo', true)
      if (typedBusiness.demo_group) query = query.eq('demo_group', typedBusiness.demo_group)
      return query
    }
    return query.eq('is_demo', false).is('demo_group', null)
  }

  const [viewsResult, clicksResult, savesResult, redemptionsResult] = await Promise.all([
    applyEnvironment(admin.from('offer_views').select('offer_id').in('offer_id', offerIds)),
    applyEnvironment(admin.from('offer_clicks').select('offer_id').in('offer_id', offerIds)),
    applyEnvironment(admin.from('saved_offers').select('offer_id').in('offer_id', offerIds)),
    applyEnvironment(
      admin
        .from('redemptions')
        .select('offer_id')
        .in('offer_id', offerIds)
        .eq('status', 'confirmed')
    ),
  ])

  if (viewsResult.error || clicksResult.error || savesResult.error || redemptionsResult.error) {
    return {
      success: false,
      reason: 'analytics-lookup-failure',
      message: 'Unable to load business engagement analytics.',
    }
  }

  const viewRows = (viewsResult.data ?? []) as EventRow[]
  const clickRows = (clicksResult.data ?? []) as EventRow[]
  const saveRows = (savesResult.data ?? []) as EventRow[]
  const redemptionRows = (redemptionsResult.data ?? []) as EventRow[]

  const viewCounts = countByOffer(viewRows)
  const clickCounts = countByOffer(clickRows)
  const saveCounts = countByOffer(saveRows)
  const redemptionCounts = countByOffer(redemptionRows)

  const mapped = offers.map((offer) => {
    const views = viewCounts.get(offer.id) ?? 0
    const confirmedRedemptions = redemptionCounts.get(offer.id) ?? 0
    return {
      offerId: offer.id,
      title: offer.title,
      views,
      clicks: clickCounts.get(offer.id) ?? 0,
      saves: saveCounts.get(offer.id) ?? 0,
      confirmedRedemptions,
      conversionRate: rate(confirmedRedemptions, views),
    }
  })

  const summary = {
    views: viewRows.length,
    clicks: clickRows.length,
    saves: saveRows.length,
    confirmedRedemptions: redemptionRows.length,
    conversionRate: rate(redemptionRows.length, viewRows.length),
  }

  return {
    success: true,
    workspace: authorizationResult.workspace,
    offers: mapped,
    summary,
  }
}
