import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const DEMO_GROUP_KEY = 'lakeview_launch_2026'

const DEMO_IDENTITIES = {
  customer: {
    email: 'supporter.demo@raisehub.app',
    fullName: 'Maya Thompson',
    displayName: 'Maya Thompson',
  },
  business: {
    email: 'business.demo@raisehub.app',
    fullName: 'Jordan Lee',
    displayName: 'Jordan Lee',
    businessName: 'Maple Street Coffee Co.',
  },
  organization: {
    email: 'organization.demo@raisehub.app',
    fullName: 'Elena Ramirez',
    displayName: 'Elena Ramirez',
    businessName: 'Lakeview Elementary PTA',
  },
} as const

type DemoRole = keyof typeof DEMO_IDENTITIES

type SeededIdentity = {
  id: string
  email: string
  role: DemoRole
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

async function findOrCreateAuthUser(
  email: string,
  password: string,
  fullName: string
) {
  const admin = createAdminClient()
  const normalizedEmail = email.toLowerCase()

  const { data: listedUsers, error: listError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (listError) throw listError

  const existing = listedUsers.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail
  )

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(
      existing.id,
      {
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      }
    )

    if (error || !data.user) {
      throw error ?? new Error(`Could not update ${email}.`)
    }

    return data.user
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error || !data.user) {
    throw error ?? new Error(`Could not create ${email}.`)
  }

  return data.user
}

async function seedIdentity(
  role: DemoRole,
  password: string
): Promise<SeededIdentity> {
  const admin = createAdminClient()
  const identity = DEMO_IDENTITIES[role]
  const authUser = await findOrCreateAuthUser(
    identity.email,
    password,
    identity.fullName
  )

  const { error } = await admin.from('profiles').upsert(
    {
      id: authUser.id,
      email: identity.email,
      role,
      full_name: identity.fullName,
      display_name: identity.displayName,
      business_name:
        'businessName' in identity ? identity.businessName : null,
      subscription_tier: role === 'business' ? 'growth' : 'free',
      onboarding_completed: true,
      is_demo: true,
      demo_group: DEMO_GROUP_KEY,
    },
    { onConflict: 'id' }
  )

  if (error) throw error

  return { id: authUser.id, email: identity.email, role }
}

export async function POST() {
  const owner = await requireOwner()

  if (!owner) {
    return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })
  }

  const password = process.env.DEMO_ACCOUNT_PASSWORD

  if (!password || password.length < 12) {
    return NextResponse.json(
      {
        error:
          'Set DEMO_ACCOUNT_PASSWORD to a strong password of at least 12 characters before seeding.',
      },
      { status: 503 }
    )
  }

  const admin = createAdminClient()

  try {
    const identities = await Promise.all(
      (Object.keys(DEMO_IDENTITIES) as DemoRole[]).map((role) =>
        seedIdentity(role, password)
      )
    )

    const identityByRole = Object.fromEntries(
      identities.map((identity) => [identity.role, identity])
    ) as Record<DemoRole, SeededIdentity>

    await admin
      .from('demo_groups')
      .update({ is_default: false })
      .eq('is_default', true)

    const { data: group, error: groupError } = await admin
      .from('demo_groups')
      .upsert(
        {
          group_key: DEMO_GROUP_KEY,
          name: 'Lakeview Playground Launch',
          description:
            'Lakeview Elementary PTA raises money for playground improvements with support from Maple Street Coffee Co. and local supporters.',
          scenario_type: 'fundraiser',
          status: 'active',
          is_default: true,
          created_by: owner.id,
          metadata: {
            story_version: 1,
            organization: 'Lakeview Elementary PTA',
            business: 'Maple Street Coffee Co.',
            supporter: 'Maya Thompson',
          },
        },
        { onConflict: 'group_key' }
      )
      .select('id, group_key')
      .single<{ id: string; group_key: string }>()

    if (groupError || !group) throw groupError

    for (const identity of identities) {
      const label =
        identity.role === 'customer'
          ? 'Maya — Supporter'
          : identity.role === 'business'
            ? 'Jordan — Business Owner'
            : 'Elena — Organization Leader'

      const { error } = await admin.from('demo_profiles').upsert(
        {
          demo_group_id: group.id,
          profile_id: identity.id,
          slug: identity.role,
          label,
          role: identity.role,
          status: 'active',
          is_primary: true,
          baseline_data: {
            email: identity.email,
            demo_group: DEMO_GROUP_KEY,
          },
          metadata: { curated: true, story_version: 1 },
        },
        { onConflict: 'demo_group_id,slug' }
      )

      if (error) throw error
    }

    const organizationUser = identityByRole.organization
    const businessUser = identityByRole.business
    const customerUser = identityByRole.customer

    const { data: organization, error: organizationError } = await admin
      .from('organizations')
      .upsert(
        {
          legacy_profile_id: organizationUser.id,
          name: 'Lakeview Elementary PTA',
          description:
            'A parent-led organization raising funds for safer, more inclusive playground equipment.',
          organization_type: 'school',
          email: organizationUser.email,
          status: 'active',
          created_by: organizationUser.id,
          is_demo: true,
          demo_group: DEMO_GROUP_KEY,
          town_name: 'Lubbock',
          state_code: 'TX',
        },
        { onConflict: 'legacy_profile_id' }
      )
      .select('id')
      .single<{ id: string }>()

    if (organizationError || !organization) throw organizationError

    const { error: organizationMembershipError } = await admin
      .from('organization_memberships')
      .upsert(
        {
          organization_id: organization.id,
          user_id: organizationUser.id,
          membership_role: 'admin',
          status: 'active',
          display_name: 'Elena Ramirez',
          accepted_at: new Date().toISOString(),
          is_demo: true,
          demo_group: DEMO_GROUP_KEY,
        },
        { onConflict: 'organization_id,user_id' }
      )

    if (organizationMembershipError) throw organizationMembershipError

    const { data: business, error: businessError } = await admin
      .from('businesses')
      .upsert(
        {
          legacy_profile_id: businessUser.id,
          name: 'Maple Street Coffee Co.',
          legal_name: 'Maple Street Coffee Co.',
          description:
            'A neighborhood coffee shop supporting local schools and community programs.',
          category: 'Coffee & Bakery',
          email: businessUser.email,
          status: 'active',
          subscription_tier: 'growth',
          created_by: businessUser.id,
          is_demo: true,
          demo_group: DEMO_GROUP_KEY,
          address: '412 Maple Street, Lubbock, TX',
        },
        { onConflict: 'legacy_profile_id' }
      )
      .select('id')
      .single<{ id: string }>()

    if (businessError || !business) throw businessError

    const { error: businessMembershipError } = await admin
      .from('business_memberships')
      .upsert(
        {
          business_id: business.id,
          user_id: businessUser.id,
          membership_role: 'owner',
          status: 'active',
          accepted_at: new Date().toISOString(),
          is_demo: true,
          demo_group: DEMO_GROUP_KEY,
        },
        { onConflict: 'business_id,user_id' }
      )

    if (businessMembershipError) throw businessMembershipError

    const now = new Date()
    const startsAt = new Date(now)
    startsAt.setDate(now.getDate() - 21)
    const endsAt = new Date(now)
    endsAt.setDate(now.getDate() + 75)

    const { data: campaign, error: campaignError } = await admin
      .from('campaigns')
      .upsert(
        {
          organization_id: organizationUser.id,
          canonical_organization_id: organization.id,
          name: 'Lakeview Playground Improvement Fund',
          description:
            'Help Lakeview Elementary add inclusive playground equipment, shaded seating, and safer ground surfacing.',
          goal_amount: 15000,
          pass_price: 20,
          starts_at: startsAt.toISOString().slice(0, 10),
          ends_at: endsAt.toISOString().slice(0, 10),
          status: 'active',
          review_status: 'approved',
          content_revision: 1,
          approved_revision: 1,
          is_demo: true,
          demo_group: DEMO_GROUP_KEY,
        },
        { onConflict: 'organization_id,name' }
      )
      .select('id')
      .single<{ id: string }>()

    if (campaignError || !campaign) throw campaignError

    const { data: offer, error: offerError } = await admin
      .from('offers')
      .upsert(
        {
          business_id: businessUser.id,
          title: 'Buy One Drink, Get One 50% Off',
          description:
            'Enjoy a second handcrafted drink for half price while supporting Lakeview Elementary.',
          usage_rule: 'one-time',
          discount: '50% off second drink',
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          expires_at: endsAt.toISOString().slice(0, 10),
          is_active: true,
          is_demo: true,
          demo_group: DEMO_GROUP_KEY,
        },
        { onConflict: 'business_id,title' }
      )
      .select('id')
      .single<{ id: string }>()

    if (offerError || !offer) throw offerError

    const { data: existingPurchase } = await admin
      .from('campaign_purchases')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('user_id', customerUser.id)
      .eq('demo_group', DEMO_GROUP_KEY)
      .maybeSingle<{ id: string }>()

    let purchaseId = existingPurchase?.id ?? null

    if (!purchaseId) {
      const { data: purchase, error: purchaseError } = await admin
        .from('campaign_purchases')
        .insert({
          campaign_id: campaign.id,
          user_id: customerUser.id,
          buyer_email: customerUser.email,
          amount_paid: 25,
          platform_fee: 2,
          organization_earnings: 23,
          selected_organization_id: organizationUser.id,
          donation_amount: 5,
          payment_status: 'test_paid',
          pass_price_charged: 20,
          platform_fee_percent: 10,
          organization_pass_earnings: 18,
          pricing_scope: 'campaign',
          pricing_resolved_at: now.toISOString(),
          organization_workspace_id: organization.id,
          is_demo: true,
          demo_group: DEMO_GROUP_KEY,
        })
        .select('id')
        .single<{ id: string }>()

      if (purchaseError || !purchase) throw purchaseError
      purchaseId = purchase.id
    }

    const entitlementExpires = new Date(now)
    entitlementExpires.setMonth(entitlementExpires.getMonth() + 6)

    const { error: entitlementError } = await admin
      .from('customer_entitlements')
      .upsert(
        {
          user_id: customerUser.id,
          purchase_id: purchaseId,
          entitlement_type: 'purchased_pass',
          status: 'active',
          starts_at: startsAt.toISOString(),
          expires_at: entitlementExpires.toISOString(),
          is_demo: true,
          demo_group: DEMO_GROUP_KEY,
        },
        { onConflict: 'purchase_id' }
      )

    if (entitlementError) throw entitlementError

    const { error: savedOfferError } = await admin.from('saved_offers').upsert(
      {
        user_id: customerUser.id,
        offer_id: offer.id,
        is_demo: true,
        demo_group: DEMO_GROUP_KEY,
      },
      { onConflict: 'user_id,offer_id' }
    )

    if (savedOfferError) throw savedOfferError

    const { data: existingRedemption } = await admin
      .from('redemptions')
      .select('id')
      .eq('offer_id', offer.id)
      .eq('user_id', customerUser.id)
      .eq('demo_group', DEMO_GROUP_KEY)
      .maybeSingle<{ id: string }>()

    if (!existingRedemption) {
      const { error } = await admin.from('redemptions').insert({
        offer_id: offer.id,
        user_id: customerUser.id,
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
        is_demo: true,
        demo_group: DEMO_GROUP_KEY,
      })

      if (error) throw error
    }

    return NextResponse.json({
      ok: true,
      groupKey: DEMO_GROUP_KEY,
      identities: {
        customer: DEMO_IDENTITIES.customer.email,
        business: DEMO_IDENTITIES.business.email,
        organization: DEMO_IDENTITIES.organization.email,
      },
    })
  } catch (error) {
    console.error('Curated demo seed failed', error)

    return NextResponse.json(
      { error: 'The curated demo story could not be seeded.' },
      { status: 500 }
    )
  }
}
