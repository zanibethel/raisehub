import 'server-only'

import {
  applyEnvironmentScope,
  getActiveDataEnvironment,
} from '@/lib/data-environment'
import { createAdminClient } from '@/lib/supabase/admin'

export type PublicBusinessEvent = {
  id: string
  business_id: string
  business_name: string
  business_logo_url: string | null
  title: string
  description: string | null
  venue_name: string | null
  address: string | null
  starts_at: string
  ends_at: string | null
  external_url: string | null
  promoted: boolean
}

export async function getPublicUpcomingBusinessEvents(
  limit = 24
): Promise<PublicBusinessEvent[]> {
  const admin = createAdminClient() as any
  const environment = getActiveDataEnvironment()
  const now = new Date().toISOString()

  const eventsQuery = admin
    .from('business_events')
    .select(
      'id,business_id,title,description,venue_name,address,starts_at,ends_at,external_url,is_published,is_demo,demo_group'
    )
    .eq('is_published', true)
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(Math.max(limit * 3, 30))

  const { data: eventData, error: eventError } = await applyEnvironmentScope(
    eventsQuery,
    environment
  )

  if (eventError || !eventData?.length) return []

  const events = eventData as Array<{
    id: string
    business_id: string
    title: string
    description: string | null
    venue_name: string | null
    address: string | null
    starts_at: string
    ends_at: string | null
    external_url: string | null
  }>

  const eventIds = events.map((event) => event.id)
  const businessIds = [...new Set(events.map((event) => event.business_id))]

  const [{ data: promotions }, { data: businesses }] = await Promise.all([
    admin
      .from('business_event_promotions')
      .select('event_id')
      .in('event_id', eventIds)
      .lte('starts_at', now)
      .gt('ends_at', now),
    admin
      .from('businesses')
      .select('id,name,logo_url')
      .in('id', businessIds),
  ])

  const promotedEventIds = new Set(
    (promotions ?? []).map((promotion: { event_id: string }) =>
      String(promotion.event_id)
    )
  )
  type BusinessLookup = {
    id: string
    name: string
    logo_url: string | null
  }

  const businessById = new Map<string, BusinessLookup>(
    ((businesses ?? []) as BusinessLookup[]).map((business) => [
      business.id,
      business,
    ])
  )

  return events
    .map((event) => {
      const business = businessById.get(event.business_id)

      return {
        id: event.id,
        business_id: event.business_id,
        business_name: business?.name ?? 'Local Business',
        business_logo_url: business?.logo_url ?? null,
        title: event.title,
        description: event.description,
        venue_name: event.venue_name,
        address: event.address,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        external_url: event.external_url,
        promoted: promotedEventIds.has(event.id),
      }
    })
    .sort((left, right) => {
      if (left.promoted !== right.promoted) {
        return left.promoted ? -1 : 1
      }

      return (
        new Date(left.starts_at).getTime() -
        new Date(right.starts_at).getTime()
      )
    })
    .slice(0, limit)
}
