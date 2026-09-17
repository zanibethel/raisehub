import { createClient } from '@/lib/supabase/server'
import FeaturedDealsCarouselClient from './featured-deals-carousel-client'
import { isDemoMode } from '@/lib/app-mode'
import { getPublicPartnerProfiles } from '@/lib/repositories/public-partner-profile-repository'
import { createAdminClient } from '@/lib/supabase/admin'

type Profile = {
  id: string
  business_name: string | null
  display_name: string | null
  logo_url: string | null
  role: string | null
}

type Offer = {
  id: string
  title: string | null
  discount: string | null
  description: string | null
  starts_at: string | null
  ends_at: string | null
  business_id: string
  featured?: boolean
}

const DEMO_SAMPLE_PROFILES: Record<string, Profile> = {
  'demo-business-1': {
    id: 'demo-business-1',
    business_name: 'Maple Street Coffee Co.',
    display_name: 'Maple Street Coffee Co.',
    logo_url: null,
    role: 'business',
  },
  'demo-business-2': {
    id: 'demo-business-2',
    business_name: 'Riverside Pizza Kitchen',
    display_name: 'Riverside Pizza Kitchen',
    logo_url: null,
    role: 'business',
  },
  'demo-business-3': {
    id: 'demo-business-3',
    business_name: 'Bright Smiles Family Dentistry',
    display_name: 'Bright Smiles Family Dentistry',
    logo_url: null,
    role: 'business',
  },
}

const DEMO_SAMPLE_OFFERS: Offer[] = [
  {
    id: 'demo-offer-1',
    title: 'Buy One Latte, Get One Free',
    discount: 'BOGO',
    description: 'Treat a friend on us — valid any time, any size.',
    starts_at: null,
    ends_at: null,
    business_id: 'demo-business-1',
  },
  {
    id: 'demo-offer-2',
    title: '20% Off Any Large Pizza',
    discount: '20% off',
    description: 'Perfect for family night or a team celebration.',
    starts_at: null,
    ends_at: null,
    business_id: 'demo-business-2',
  },
  {
    id: 'demo-offer-3',
    title: 'Free Teeth Whitening with New Patient Exam',
    discount: 'Free add-on',
    description: 'New patients only — includes full exam and cleaning.',
    starts_at: null,
    ends_at: null,
    business_id: 'demo-business-3',
  },
]

async function getFeaturedOfferOwnerIds(now: string) {
  try {
    const admin = createAdminClient() as any

    const { data: featuredItem, error: itemError } = await admin
      .from('partner_reward_marketplace_items')
      .select('id')
      .eq('code', 'featured_offer_7d')
      .eq('is_active', true)
      .maybeSingle()

    if (itemError || !featuredItem?.id) return new Set<string>()

    const { data: redemptions, error: redemptionError } = await admin
      .from('partner_reward_redemptions')
      .select('business_id')
      .eq('marketplace_item_id', featuredItem.id)
      .eq('status', 'active')
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)

    if (redemptionError || !redemptions?.length) return new Set<string>()

    const canonicalBusinessIds = [
      ...new Set(
        redemptions
          .map((redemption: { business_id?: string | null }) => redemption.business_id)
          .filter((value: string | null | undefined): value is string => Boolean(value))
      ),
    ]

    const { data: businesses, error: businessesError } = await admin
      .from('businesses')
      .select('id,legacy_profile_id')
      .in('id', canonicalBusinessIds)

    if (businessesError) return new Set<string>()

    const ownerIds = new Set<string>()
    for (const business of businesses ?? []) {
      if (business.id) ownerIds.add(business.id)
      if (business.legacy_profile_id) ownerIds.add(business.legacy_profile_id)
    }

    return ownerIds
  } catch {
    return new Set<string>()
  }
}

export default async function FeaturedDealsCarousel() {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const demoMode = isDemoMode()

  const { data: offers, error: offersError } = await supabase
    .from('offers')
    .select(
      'id, title, discount, description, starts_at, ends_at, business_id'
    )
    .eq('is_active', true)
    .eq('is_demo', demoMode)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (offersError) return null

  const candidateOffers =
    (offers as Offer[] | null)?.filter(
      (offer) => Boolean(offer.business_id) && Boolean(offer.title?.trim())
    ) ?? []

  if (candidateOffers.length === 0 && demoMode) {
    return (
      <FeaturedDealsCarouselClient
        offers={DEMO_SAMPLE_OFFERS}
        profileById={DEMO_SAMPLE_PROFILES}
      />
    )
  }

  if (candidateOffers.length === 0) return null

  const businessIds = [...new Set(candidateOffers.map((offer) => offer.business_id))]
  const { profiles, error: profilesError } = await getPublicPartnerProfiles(
    businessIds,
    { role: 'business' }
  )

  if (profilesError) return null

  const validProfiles = profiles.filter(
    (profile) =>
      profile.role === 'business' &&
      Boolean(profile.business_name?.trim() || profile.display_name?.trim())
  )

  const profileById = Object.fromEntries(
    validProfiles.map((profile) => [profile.id, profile])
  )

  const validOffers = candidateOffers.filter((offer) =>
    Boolean(profileById[offer.business_id])
  )

  if (validOffers.length === 0 && demoMode) {
    return (
      <FeaturedDealsCarouselClient
        offers={DEMO_SAMPLE_OFFERS}
        profileById={DEMO_SAMPLE_PROFILES}
      />
    )
  }

  if (validOffers.length === 0) return null

  const featuredOwnerIds = await getFeaturedOfferOwnerIds(now)
  const featuredBusinessesSeen = new Set<string>()
  const featuredOffers: Offer[] = []
  const standardOffers: Offer[] = []

  for (const offer of validOffers) {
    if (
      featuredOwnerIds.has(offer.business_id) &&
      !featuredBusinessesSeen.has(offer.business_id)
    ) {
      featuredBusinessesSeen.add(offer.business_id)
      featuredOffers.push({ ...offer, featured: true })
    } else {
      standardOffers.push(offer)
    }
  }

  const displayOffers = [...featuredOffers, ...standardOffers].slice(0, 12)

  return (
    <FeaturedDealsCarouselClient
      offers={displayOffers}
      profileById={profileById}
    />
  )
}
