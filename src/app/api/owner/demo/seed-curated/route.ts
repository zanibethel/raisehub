import { NextResponse } from 'next/server'

import {
  LAKEVIEW_BUSINESSES,
  LAKEVIEW_CAMPAIGNS,
  LAKEVIEW_DEMO_GROUP_KEY,
  LAKEVIEW_IDENTITIES,
  LAKEVIEW_OFFERS,
  validateLakeviewScenario,
  type LakeviewIdentityKey,
} from '@/lib/demo/lakeview-scenario'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type SeededIdentity = {
  id: string
  email: string
  key: LakeviewIdentityKey
}

type SeedCounts = {
  identities: number
  businesses: number
  campaigns: number
  offers: number
  purchases: number
  entitlements: number
  savedOffers: number
  redemptions: number
  repairedDuplicates: number
}

class SeedStageError extends Error {
  constructor(
    readonly stage: string,
    message: string
  ) {
    super(message)
    this.name = 'SeedStageError'
  }
}

async function requireOwner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: string }>()

  return profile?.role === 'owner' ? profile : null
}

function dateFromNow(offsetDays: number, includeTime = true) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return includeTime ? date.toISOString() : date.toISOString().slice(0, 10)
}

async function findOrCreateAuthUser(
  email: string,
  password: string,
  fullName: string
) {
  const admin = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()
  const { data: listedUsers, error: listError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (listError) throw listError

  const existing = listedUsers.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail
  )

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (error || !data.user) throw error ?? new Error('Demo identity update failed.')
    return data.user
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error || !data.user) throw error ?? new Error('Demo identity creation failed.')
  return data.user
}

async function seedIdentity(
  key: LakeviewIdentityKey,
  password: string
): Promise<SeededIdentity> {
  const admin = createAdminClient() as any
  const identity = LAKEVIEW_IDENTITIES[key]
  const authUser = await findOrCreateAuthUser(
    identity.email,
    password,
    identity.fullName
  )

  const { data: existingProfile, error: profileLookupError } = await admin
    .from('profiles')
    .select('id, is_demo, demo_group')
    .eq('id', authUser.id)
    .maybeSingle()

  if (profileLookupError) throw profileLookupError
  if (existingProfile && (!existingProfile.is_demo || existingProfile.demo_group !== LAKEVIEW_DEMO_GROUP_KEY)) {
    throw new Error('A curated demo email is already attached to a production-owned profile.')
  }

  const profile = {
    id: authUser.id,
    email: identity.email,
    role: identity.role,
    full_name: identity.fullName,
    display_name: identity.displayName,
    business_name: 'businessName' in identity ? identity.businessName : null,
    business_category:
      identity.role === 'business'
        ? LAKEVIEW_BUSINESSES.find((business) => business.key === key)?.category ?? null
        : null,
    business_description:
      identity.role === 'business'
        ? LAKEVIEW_BUSINESSES.find((business) => business.key === key)?.description ?? null
        : null,
    subscription_tier:
      identity.role === 'business'
        ? LAKEVIEW_BUSINESSES.find((business) => business.key === key)?.subscriptionTier ?? 'free'
        : 'free',
    onboarding_completed: true,
    is_demo: true,
    demo_group: LAKEVIEW_DEMO_GROUP_KEY,
  }

  const { error } = existingProfile
    ? await admin.from('profiles').update(profile).eq('id', authUser.id)
    : await admin.from('profiles').insert(profile)

  if (error) throw error
  return { id: authUser.id, email: identity.email, key }
}

async function ensureSingleRecord(
  admin: any,
  table: string,
  lookup: Record<string, unknown>,
  values: Record<string, unknown>,
  counts: SeedCounts
) {
  let query = admin.from(table).select('id, is_demo, demo_group')
  for (const [column, value] of Object.entries(lookup)) query = query.eq(column, value)

  const { data: rows, error: lookupError } = await query
  if (lookupError) throw lookupError

  const matches = rows ?? []
  const unsafe = matches.find(
    (row: any) => !row.is_demo || row.demo_group !== LAKEVIEW_DEMO_GROUP_KEY
  )
  if (unsafe) throw new Error(`Refusing to modify a production-owned ${table} record.`)

  if (matches.length > 0) {
    const keeper = matches[0]
    const { error } = await admin.from(table).update(values).eq('id', keeper.id)
    if (error) throw error

    const duplicateIds = matches.slice(1).map((row: any) => row.id)
    if (duplicateIds.length > 0) {
      const { error: deleteError } = await admin.from(table).delete().in('id', duplicateIds)
      if (deleteError) throw deleteError
      counts.repairedDuplicates += duplicateIds.length
    }

    return keeper.id as string
  }

  const { data, error } = await admin
    .from(table)
    .insert({ ...lookup, ...values })
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error(`${table} insert failed.`)
  return data.id as string
}

async function ensureMembership(
  admin: any,
  table: 'organization_memberships' | 'business_memberships',
  lookup: Record<string, string>,
  values: Record<string, unknown>,
  counts: SeedCounts
) {
  return ensureSingleRecord(
    admin,
    table,
    lookup,
    {
      ...values,
      is_demo: true,
      demo_group: LAKEVIEW_DEMO_GROUP_KEY,
    },
    counts
  )
}

export async function POST() {
  const owner = await requireOwner()
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })
  }

  const password = process.env.DEMO_ACCOUNT_PASSWORD
  if (!password || password.length < 12) {
    return NextResponse.json(
      { error: 'A strong DEMO_ACCOUNT_PASSWORD is required before seeding.' },
      { status: 503 }
    )
  }

  validateLakeviewScenario()
  const admin = createAdminClient() as any
  const counts: SeedCounts = {
    identities: 0,
    businesses: 0,
    campaigns: 0,
    offers: 0,
    purchases: 0,
    entitlements: 0,
    savedOffers: 0,
    redemptions: 0,
    repairedDuplicates: 0,
  }
  let stage = 'identities'

  try {
    const identities = await Promise.all(
      (Object.keys(LAKEVIEW_IDENTITIES) as LakeviewIdentityKey[]).map((key) =>
        seedIdentity(key, password)
      )
    )
    counts.identities = identities.length
    const identityByKey = Object.fromEntries(
      identities.map((identity) => [identity.key, identity])
    ) as Record<LakeviewIdentityKey, SeededIdentity>

    stage = 'demo-group'
    const { data: group, error: groupError } = await admin
      .from('demo_groups')
      .upsert(
        {
          group_key: LAKEVIEW_DEMO_GROUP_KEY,
          name: 'Lakeview Community Fundraising Demo',
          description: 'A connected demo community with varied campaigns, local businesses, supporter purchases, saved offers, and redemptions.',
          scenario_type: 'fundraiser',
          status: 'active',
          is_default: true,
          created_by: owner.id,
          metadata: {
            curated: true,
            story_version: 2,
            baseline_businesses: LAKEVIEW_BUSINESSES.length,
            baseline_campaigns: LAKEVIEW_CAMPAIGNS.length,
            baseline_offers: LAKEVIEW_OFFERS.length,
          },
        },
        { onConflict: 'group_key' }
      )
      .select('id, group_key')
      .single()

    if (groupError || !group) throw groupError ?? new Error('Demo group unavailable.')

    stage = 'demo-profiles'
    for (const identity of identities) {
      const definition = LAKEVIEW_IDENTITIES[identity.key]
      const { error } = await admin.from('demo_profiles').upsert(
        {
          demo_group_id: group.id,
          profile_id: identity.id,
          slug: definition.slug,
          label: `${definition.displayName} — ${definition.role}`,
          role: definition.role,
          status: 'active',
          is_primary: ['customer', 'organization', 'mapleCoffee'].includes(identity.key),
          baseline_data: { email: identity.email, demo_group: LAKEVIEW_DEMO_GROUP_KEY },
          metadata: { curated: true, story_version: 2, identity_key: identity.key },
        },
        { onConflict: 'demo_group_id,slug' }
      )
      if (error) throw error
    }

    stage = 'organization'
    const organizationUser = identityByKey.organization
    const { data: existingOrganization } = await admin
      .from('organizations')
      .select('id, is_demo, demo_group')
      .eq('legacy_profile_id', organizationUser.id)
      .maybeSingle()

    if (existingOrganization && (!existingOrganization.is_demo || existingOrganization.demo_group !== LAKEVIEW_DEMO_GROUP_KEY)) {
      throw new Error('Refusing to modify a production-owned organization.')
    }

    const organizationValues = {
      legacy_profile_id: organizationUser.id,
      name: 'Lakeview Elementary PTA',
      description: 'A parent-led organization raising funds for inclusive student programs, campus improvements, and family resources.',
      organization_type: 'school',
      email: organizationUser.email,
      phone: '(806) 555-0104',
      website_url: 'https://example.com/lakeview-pta',
      status: 'active',
      created_by: organizationUser.id,
      is_demo: true,
      demo_group: LAKEVIEW_DEMO_GROUP_KEY,
      town_name: 'Lubbock',
      state_code: 'TX',
    }

    const organizationResult = existingOrganization
      ? await admin.from('organizations').update(organizationValues).eq('id', existingOrganization.id).select('id').single()
      : await admin.from('organizations').insert(organizationValues).select('id').single()
    if (organizationResult.error || !organizationResult.data) throw organizationResult.error
    const organizationId = organizationResult.data.id as string

    await ensureMembership(
      admin,
      'organization_memberships',
      { organization_id: organizationId, user_id: organizationUser.id },
      {
        membership_role: 'admin',
        status: 'active',
        display_name: 'Elena Ramirez',
        accepted_at: new Date().toISOString(),
      },
      counts
    )

    stage = 'businesses'
    const businessIds: Record<string, string> = {}
    for (const business of LAKEVIEW_BUSINESSES) {
      const identity = identityByKey[business.key]
      const { data: existingBusiness } = await admin
        .from('businesses')
        .select('id, is_demo, demo_group')
        .eq('legacy_profile_id', identity.id)
        .maybeSingle()

      if (existingBusiness && (!existingBusiness.is_demo || existingBusiness.demo_group !== LAKEVIEW_DEMO_GROUP_KEY)) {
        throw new Error(`Refusing to modify production business ${business.name}.`)
      }

      const values = {
        legacy_profile_id: identity.id,
        name: business.name,
        legal_name: business.name,
        description: business.description,
        category: business.category,
        phone: business.phone,
        email: identity.email,
        website_url: business.websiteUrl,
        google_maps_url: business.mapsUrl,
        address: business.address,
        status: 'active',
        subscription_tier: business.subscriptionTier,
        created_by: identity.id,
        is_demo: true,
        demo_group: LAKEVIEW_DEMO_GROUP_KEY,
      }

      const result = existingBusiness
        ? await admin.from('businesses').update(values).eq('id', existingBusiness.id).select('id').single()
        : await admin.from('businesses').insert(values).select('id').single()
      if (result.error || !result.data) throw result.error
      businessIds[business.key] = result.data.id

      await admin.from('profiles').update({
        business_name: business.name,
        display_name: business.name,
        business_category: business.category,
        business_description: business.description,
        phone: business.phone,
        address: business.address,
        website_url: business.websiteUrl,
        google_maps_url: business.mapsUrl,
      }).eq('id', identity.id)

      await ensureMembership(
        admin,
        'business_memberships',
        { business_id: result.data.id, user_id: identity.id },
        {
          membership_role: 'owner',
          status: 'active',
          accepted_at: new Date().toISOString(),
        },
        counts
      )
    }
    counts.businesses = LAKEVIEW_BUSINESSES.length

    stage = 'campaigns'
    const campaignIds: Record<string, string> = {}
    for (const campaign of LAKEVIEW_CAMPAIGNS) {
      const campaignId = await ensureSingleRecord(
        admin,
        'campaigns',
        {
          organization_id: organizationUser.id,
          name: campaign.name,
          demo_group: LAKEVIEW_DEMO_GROUP_KEY,
        },
        {
          canonical_organization_id: organizationId,
          description: campaign.description,
          goal_amount: campaign.goalAmount,
          pass_price: 20,
          starts_at: dateFromNow(-campaign.daysStartedAgo, false),
          ends_at: dateFromNow(campaign.daysRemaining, false),
          status: campaign.status,
          review_status: 'approved',
          content_revision: 1,
          approved_revision: 1,
          is_demo: true,
          demo_group: LAKEVIEW_DEMO_GROUP_KEY,
        },
        counts
      )
      campaignIds[campaign.key] = campaignId
    }
    counts.campaigns = LAKEVIEW_CAMPAIGNS.length

    stage = 'offers'
    const offerIds: Record<string, string> = {}
    for (const offer of LAKEVIEW_OFFERS) {
      const businessIdentity = identityByKey[offer.businessKey]
      const offerId = await ensureSingleRecord(
        admin,
        'offers',
        {
          business_id: businessIdentity.id,
          title: offer.title,
          demo_group: LAKEVIEW_DEMO_GROUP_KEY,
        },
        {
          description: offer.description,
          usage_rule: offer.usageRule,
          discount: offer.discount,
          starts_at: dateFromNow(offer.startOffsetDays),
          ends_at: dateFromNow(offer.endOffsetDays),
          expires_at: dateFromNow(offer.endOffsetDays, false),
          is_active: offer.active,
          is_demo: true,
          demo_group: LAKEVIEW_DEMO_GROUP_KEY,
        },
        counts
      )
      offerIds[offer.key] = offerId
    }
    counts.offers = LAKEVIEW_OFFERS.length

    stage = 'campaign-activity'
    const customer = identityByKey.customer
    let primaryPurchaseId: string | null = null
    for (const campaign of LAKEVIEW_CAMPAIGNS) {
      for (let index = 1; index <= campaign.purchaseCount; index += 1) {
        const buyerEmail = `lakeview+${campaign.key}-${String(index).padStart(2, '0')}@raisehub.app`
        const purchaseId = await ensureSingleRecord(
          admin,
          'campaign_purchases',
          {
            campaign_id: campaignIds[campaign.key],
            buyer_email: buyerEmail,
            demo_group: LAKEVIEW_DEMO_GROUP_KEY,
          },
          {
            user_id: campaign.key === 'playground' && index === 1 ? customer.id : null,
            amount_paid: index % 5 === 0 ? 25 : 20,
            platform_fee: 2,
            organization_earnings: index % 5 === 0 ? 23 : 18,
            selected_organization_id: organizationUser.id,
            donation_amount: index % 5 === 0 ? 5 : 0,
            seller_name: index % 3 === 0 ? `Lakeview Seller ${((index - 1) % 6) + 1}` : null,
            payment_status: 'test_paid',
            pass_price_charged: 20,
            platform_fee_percent: 10,
            organization_pass_earnings: 18,
            pricing_scope: 'campaign',
            pricing_resolved_at: dateFromNow(-Math.min(index, campaign.daysStartedAgo)),
            organization_workspace_id: organizationId,
            is_demo: true,
            demo_group: LAKEVIEW_DEMO_GROUP_KEY,
          },
          counts
        )
        counts.purchases += 1
        if (campaign.key === 'playground' && index === 1) primaryPurchaseId = purchaseId
      }
    }

    if (!primaryPurchaseId) throw new Error('Primary supporter purchase was not created.')

    stage = 'customer-entitlement'
    await ensureSingleRecord(
      admin,
      'customer_entitlements',
      {
        purchase_id: primaryPurchaseId,
        user_id: customer.id,
        demo_group: LAKEVIEW_DEMO_GROUP_KEY,
      },
      {
        entitlement_type: 'purchased_pass',
        status: 'active',
        starts_at: dateFromNow(-28),
        expires_at: dateFromNow(152),
        is_demo: true,
        demo_group: LAKEVIEW_DEMO_GROUP_KEY,
      },
      counts
    )
    counts.entitlements = 1

    stage = 'offer-activity'
    for (const offerKey of ['coffee-bogo', 'salon-upgrade', 'fitness-class']) {
      const { error } = await admin.from('saved_offers').upsert(
        {
          user_id: customer.id,
          offer_id: offerIds[offerKey],
          is_demo: true,
          demo_group: LAKEVIEW_DEMO_GROUP_KEY,
        },
        { onConflict: 'user_id,offer_id' }
      )
      if (error) throw error
      counts.savedOffers += 1
    }

    await ensureSingleRecord(
      admin,
      'redemptions',
      {
        offer_id: offerIds['coffee-bogo'],
        user_id: customer.id,
        demo_group: LAKEVIEW_DEMO_GROUP_KEY,
      },
      {
        created_at: dateFromNow(-3),
        is_demo: true,
        demo_group: LAKEVIEW_DEMO_GROUP_KEY,
      },
      counts
    )
    counts.redemptions = 1

    return NextResponse.json({
      ok: true,
      groupKey: LAKEVIEW_DEMO_GROUP_KEY,
      storyVersion: 2,
      counts,
      campaignProgressSource: 'completed demo campaign_purchases and organization_earnings',
      isolation: {
        isDemo: true,
        demoGroup: LAKEVIEW_DEMO_GROUP_KEY,
        productionRecordsModified: false,
        ownerIdentityModified: false,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown seed failure.'
    console.error('Curated demo seed failed', { stage, message })

    return NextResponse.json(
      {
        error: 'The curated demo scenario could not be seeded.',
        stage,
        repairable: true,
      },
      { status: 500 }
    )
  }
}
