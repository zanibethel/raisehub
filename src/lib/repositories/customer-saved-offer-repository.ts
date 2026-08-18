import {
  applyEnvironmentScope,
  getActiveDataEnvironment,
  recordMatchesEnvironment,
  recordsShareEnvironment,
} from '@/lib/data-environment'
import { getPublicPartnerProfiles } from '@/lib/repositories/public-partner-profile-repository'
import { createClient } from '@/lib/supabase/server'

type RawSavedOfferRow = {
  id: string
  offer_id: string
  created_at: string
  is_demo: boolean
  demo_group: string | null
  offers: {
    title: string
    business_id: string
    is_demo: boolean
    demo_group: string | null
  } | null
}

export type CustomerSavedOfferRecord = {
  id: string
  offer_id: string
  offer_title: string | null
  business_name: string | null
  created_at: string
}

type CustomerSavedOffersResult = {
  savedOffers: CustomerSavedOfferRecord[]
  error: string | null
}

export async function getCustomerSavedOffers(
  customerProfileId: string
): Promise<CustomerSavedOffersResult> {
  const supabase = await createClient()
  const environment = getActiveDataEnvironment()

  const query = supabase
    .from('saved_offers')
    .select(
      `
        id,
        offer_id,
        created_at,
        is_demo,
        demo_group,
        offers(title, business_id, is_demo, demo_group)
      `
    )
    .eq('user_id', customerProfileId)
    .order('created_at', { ascending: false })

  const { data: rawData, error: savedOffersError } =
    await applyEnvironmentScope(query, environment)

  if (savedOffersError) {
    return { savedOffers: [], error: savedOffersError.message }
  }

  const rows = ((rawData ?? []) as unknown as RawSavedOfferRow[]).filter(
    (row) =>
      Boolean(row.offers) &&
      recordMatchesEnvironment(row.offers ?? {}, environment) &&
      recordsShareEnvironment(row, row.offers ?? {})
  )

  const businessIds = [
    ...new Set(
      rows
        .map((row) => row.offers?.business_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const businessNameById = new Map<string, string>()

  if (businessIds.length > 0) {
    const { profiles, error } = await getPublicPartnerProfiles(businessIds, {
      role: 'business',
      environment,
    })

    if (error) return { savedOffers: [], error }

    for (const profile of profiles) {
      businessNameById.set(
        profile.id,
        profile.display_name || profile.business_name || 'Local Business'
      )
    }
  }

  return {
    savedOffers: rows
      .filter((row) =>
        Boolean(
          row.offers?.business_id &&
            businessNameById.has(row.offers.business_id)
        )
      )
      .map((row) => ({
        id: row.id,
        offer_id: row.offer_id,
        offer_title: row.offers?.title ?? null,
        business_name: row.offers?.business_id
          ? (businessNameById.get(row.offers.business_id) ?? null)
          : null,
        created_at: row.created_at,
      })),
    error: null,
  }
}
