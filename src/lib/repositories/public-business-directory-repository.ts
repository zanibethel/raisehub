import 'server-only'

import {
  applyEnvironmentScope,
  getActiveDataEnvironment,
  type DataEnvironment,
  type EnvironmentOwnedRecord,
} from '@/lib/data-environment'
import {
  getPublicPartnerProfiles,
  type PublicPartnerProfile,
} from '@/lib/repositories/public-partner-profile-repository'
import { createAdminClient } from '@/lib/supabase/admin'

type CanonicalBusinessRow = EnvironmentOwnedRecord & {
  id: string
  legacy_profile_id: string | null
  status: string | null
  founder_status: boolean | null
}

type VerificationRow = {
  business_id: string
  status: string | null
  created_at: string | null
  updated_at: string | null
}

type BusinessSiteRow = {
  business_id: string
  slug: string
}

export type PublicBusinessOffer = EnvironmentOwnedRecord & {
  id: string
  title: string | null
  discount: string | null
  description: string | null
  customer_value: number | null
  ends_at: string | null
  business_id: string
}

export type PublicBusinessDirectoryEntry = {
  profile: PublicPartnerProfile
  canonicalBusinessId: string | null
  verificationStatus: string | null
  founderStatus: boolean
  publishedSiteSlug: string | null
  activeOfferCount: number
}

function newestVerificationByBusiness(rows: VerificationRow[]) {
  const result = new Map<string, VerificationRow>()

  for (const row of rows) {
    const current = result.get(row.business_id)
    const currentStamp = current?.updated_at || current?.created_at || ''
    const rowStamp = row.updated_at || row.created_at || ''

    if (!current || rowStamp > currentStamp) {
      result.set(row.business_id, row)
    }
  }

  return result
}

async function loadDirectoryMetadata(
  profileIds: string[],
  environment: DataEnvironment,
  nowIso: string
) {
  const admin = createAdminClient() as any

  if (profileIds.length === 0) {
    return {
      canonicalByProfileId: new Map<string, CanonicalBusinessRow>(),
      verificationByBusinessId: new Map<string, VerificationRow>(),
      siteByBusinessId: new Map<string, BusinessSiteRow>(),
      offers: [] as PublicBusinessOffer[],
    }
  }

  const businessesQuery = admin
    .from('businesses')
    .select('id, legacy_profile_id, status, founder_status, is_demo, demo_group')
    .in('legacy_profile_id', profileIds)
    .eq('status', 'active')

  const [{ data: businessData }, offersResult] = await Promise.all([
    applyEnvironmentScope(businessesQuery, environment),
    applyEnvironmentScope(
      admin
        .from('offers')
        .select(
          'id, title, discount, description, customer_value, ends_at, business_id, is_demo, demo_group'
        )
        .in('business_id', profileIds)
        .eq('is_active', true)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`),
      environment
    ),
  ])

  const businesses = (businessData ?? []) as CanonicalBusinessRow[]
  const businessIds = businesses.map((business) => business.id)

  const [verificationResult, siteResult] = await Promise.all([
    businessIds.length
      ? admin
          .from('business_verifications')
          .select('business_id, status, created_at, updated_at')
          .in('business_id', businessIds)
      : Promise.resolve({ data: [] as VerificationRow[] }),
    businessIds.length
      ? admin
          .from('business_sites')
          .select('business_id, slug')
          .in('business_id', businessIds)
          .eq('is_published', true)
      : Promise.resolve({ data: [] as BusinessSiteRow[] }),
  ])

  return {
    canonicalByProfileId: new Map(
      businesses
        .filter((business) => Boolean(business.legacy_profile_id))
        .map((business) => [business.legacy_profile_id as string, business])
    ),
    verificationByBusinessId: newestVerificationByBusiness(
      (verificationResult.data ?? []) as VerificationRow[]
    ),
    siteByBusinessId: new Map(
      ((siteResult.data ?? []) as BusinessSiteRow[]).map((site) => [
        site.business_id,
        site,
      ])
    ),
    offers: (offersResult.data ?? []) as PublicBusinessOffer[],
  }
}

export async function getPublicBusinessDirectory(options: {
  environment?: DataEnvironment
  limit?: number
} = {}): Promise<{
  businesses: PublicBusinessDirectoryEntry[]
  error: string | null
}> {
  const environment = options.environment ?? getActiveDataEnvironment()
  const { profiles, error } = await getPublicPartnerProfiles(null, {
    role: 'business',
    environment,
    limit: options.limit ?? 80,
  })

  if (error) return { businesses: [], error }

  const visibleProfiles = profiles.filter((profile) =>
    Boolean(profile.display_name?.trim() || profile.business_name?.trim())
  )

  const metadata = await loadDirectoryMetadata(
    visibleProfiles.map((profile) => profile.id),
    environment,
    new Date().toISOString()
  )

  const offerCountByProfileId = new Map<string, number>()
  for (const offer of metadata.offers) {
    offerCountByProfileId.set(
      offer.business_id,
      (offerCountByProfileId.get(offer.business_id) ?? 0) + 1
    )
  }

  const businesses = visibleProfiles
    .map((profile) => {
      const canonical = metadata.canonicalByProfileId.get(profile.id) ?? null
      const verification = canonical
        ? metadata.verificationByBusinessId.get(canonical.id) ?? null
        : null
      const site = canonical
        ? metadata.siteByBusinessId.get(canonical.id) ?? null
        : null

      return {
        profile,
        canonicalBusinessId: canonical?.id ?? null,
        verificationStatus: verification?.status ?? null,
        founderStatus: canonical?.founder_status === true,
        publishedSiteSlug: site?.slug ?? null,
        activeOfferCount: offerCountByProfileId.get(profile.id) ?? 0,
      } satisfies PublicBusinessDirectoryEntry
    })
    .filter(
      (entry) =>
        Boolean(entry.canonicalBusinessId) &&
        (entry.verificationStatus === 'approved' ||
          entry.verificationStatus === 'pending')
    )
    .sort((a, b) => {
      if (a.verificationStatus === 'approved' && b.verificationStatus !== 'approved') return -1
      if (b.verificationStatus === 'approved' && a.verificationStatus !== 'approved') return 1
      if (a.activeOfferCount !== b.activeOfferCount) return b.activeOfferCount - a.activeOfferCount

      const aName = a.profile.display_name || a.profile.business_name || ''
      const bName = b.profile.display_name || b.profile.business_name || ''
      return aName.localeCompare(bName)
    })

  return { businesses, error: null }
}

export async function getPublicBusinessProfile(
  profileId: string,
  options: {
    environment?: DataEnvironment
  } = {}
): Promise<{
  business: PublicBusinessDirectoryEntry | null
  offers: PublicBusinessOffer[]
  error: string | null
}> {
  const environment = options.environment ?? getActiveDataEnvironment()
  const { profiles, error } = await getPublicPartnerProfiles([profileId], {
    role: 'business',
    environment,
  })

  if (error) return { business: null, offers: [], error }

  const profile = profiles[0] ?? null
  if (!profile) return { business: null, offers: [], error: null }

  const metadata = await loadDirectoryMetadata(
    [profile.id],
    environment,
    new Date().toISOString()
  )

  const canonical = metadata.canonicalByProfileId.get(profile.id) ?? null
  if (!canonical) return { business: null, offers: [], error: null }

  const verification =
    metadata.verificationByBusinessId.get(canonical.id) ?? null
  const site = metadata.siteByBusinessId.get(canonical.id) ?? null
  const offers = metadata.offers.filter(
    (offer) => offer.business_id === profile.id
  )

  return {
    business: {
      profile,
      canonicalBusinessId: canonical.id,
      verificationStatus: verification?.status ?? null,
      founderStatus: canonical.founder_status === true,
      publishedSiteSlug: site?.slug ?? null,
      activeOfferCount: offers.length,
    },
    offers,
    error: null,
  }
}
