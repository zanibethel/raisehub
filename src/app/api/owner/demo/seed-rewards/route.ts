import { NextResponse } from 'next/server'

import { LAKEVIEW_DEMO_GROUP_KEY } from '@/lib/demo/lakeview-scenario'
import { reconcileDemoPartnerRewards } from '@/lib/rewards/demo-partner-rewards-reconciliation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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

async function ensureDemoOffer(
  admin: any,
  businessProfileId: string,
  title: string,
  values: Record<string, unknown>
) {
  const { data: existing, error: lookupError } = await admin
    .from('offers')
    .select('id')
    .eq('business_id', businessProfileId)
    .eq('title', title)
    .eq('is_demo', true)
    .eq('demo_group', LAKEVIEW_DEMO_GROUP_KEY)
    .maybeSingle()

  if (lookupError) throw lookupError

  if (existing) {
    const { error } = await admin
      .from('offers')
      .update(values)
      .eq('id', existing.id)
    if (error) throw error
    return existing.id as string
  }

  const { data, error } = await admin
    .from('offers')
    .insert({
      business_id: businessProfileId,
      title,
      is_demo: true,
      demo_group: LAKEVIEW_DEMO_GROUP_KEY,
      ...values,
    })
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error('Demo rewards offer could not be created.')
  return data.id as string
}

export async function POST() {
  const owner = await requireOwner()
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })
  }

  const admin = createAdminClient() as any

  try {
    const { data: period, error: periodError } = await admin
      .from('partner_reward_periods')
      .select('id, starts_at, ends_at, rule_version')
      .eq('status', 'open')
      .maybeSingle()

    if (periodError || !period) {
      throw periodError ?? new Error('Open Partner Rewards period unavailable.')
    }

    const { data: businesses, error: businessError } = await admin
      .from('businesses')
      .select('id, name, legacy_profile_id, subscription_tier')
      .eq('is_demo', true)
      .eq('demo_group', LAKEVIEW_DEMO_GROUP_KEY)
      .order('name')

    if (businessError) throw businessError
    const demoBusinesses = businesses ?? []
    const businessIds = demoBusinesses.map((business: any) => business.id)

    if (businessIds.length === 0) {
      throw new Error('Seed the Lakeview demo before preparing Partner Rewards.')
    }

    // Reset only rewards-derived Lakeview state. Production reward data is untouched.
    await admin
      .from('partner_reward_redemptions')
      .delete()
      .in('business_id', businessIds)

    await admin
      .from('offer_reward_score_snapshots')
      .delete()
      .in('business_id', businessIds)

    await admin
      .from('partner_point_events')
      .delete()
      .in('business_id', businessIds)

    // Maple is the interactive completion scenario: it intentionally starts
    // without the logo required by the real profile-completion rule.
    const maple = demoBusinesses.find(
      (business: any) => business.name === 'Maple Street Coffee Co.'
    )
    if (maple?.legacy_profile_id) {
      const { error } = await admin
        .from('profiles')
        .update({ logo_url: null })
        .eq('id', maple.legacy_profile_id)
      if (error) throw error
    }

    // Other curated businesses should be complete enough to demonstrate their
    // existing offer/redemption states. Preserve custom demo logos when present.
    for (const business of demoBusinesses) {
      if (!business.legacy_profile_id || business.name === 'Maple Street Coffee Co.') continue
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('logo_url')
        .eq('id', business.legacy_profile_id)
        .maybeSingle()
      if (profileError) throw profileError
      if (!profile?.logo_url) {
        const { error } = await admin
          .from('profiles')
          .update({ logo_url: '/default-business-logo.png' })
          .eq('id', business.legacy_profile_id)
        if (error) throw error
      }
    }

    // BrightSide is the marketplace-spend scenario. These are real demo offers,
    // not direct point grants: the rewards engine scores their content and
    // credits only the qualifying days that overlap the current quarter.
    const brightSide = demoBusinesses.find(
      (business: any) => business.name === 'BrightSide Home Services'
    )
    if (brightSide?.legacy_profile_id) {
      const commonValues = {
        usage_rule: 'one-time',
        starts_at: period.starts_at,
        ends_at: period.ends_at,
        expires_at: period.ends_at,
        is_active: true,
      }

      await ensureDemoOffer(
        admin,
        brightSide.legacy_profile_id,
        'Free Filter Check with Seasonal Service',
        {
          ...commonValues,
          description: 'Receive a complimentary filter check with a paid seasonal home service visit.',
          discount: 'Free add-on',
        }
      )

      await ensureDemoOffer(
        admin,
        brightSide.legacy_profile_id,
        '$25 Off a First Repair Over $150',
        {
          ...commonValues,
          description: 'Save $25 on a qualifying first repair of $150 or more.',
          discount: '$25 off',
        }
      )
    }

    const reconciliation = []
    for (const business of demoBusinesses) {
      const details = await reconcileDemoPartnerRewards(business.id)
      reconciliation.push({
        businessId: business.id,
        businessName: business.name,
        ...details,
      })
    }

    // Maple is also the end-to-end Event Promotion showcase. Give this demo
    // business enough demo-only eligible points to publish an event, redeem the
    // 600-point promotion, and then switch to the Supporter demo to see the
    // generated Spotlight. Production businesses never receive this seed credit.
    if (maple?.id) {
      const { error: eventPromotionCreditError } = await admin
        .from('partner_point_events')
        .insert({
          business_id: maple.id,
          reward_period_id: period.id,
          event_type: 'demo_event_promotion_showcase',
          points: 700,
          eligibility_status: 'eligible',
          source_type: 'demo_seed',
          source_id: maple.id,
          idempotency_key: `demo:event-promotion-showcase:${period.id}:${maple.id}`,
          rule_version: period.rule_version,
          metadata: {
            demo_only: true,
            scenario: 'event_promotion_spotlight',
          },
          is_demo: true,
          demo_group: LAKEVIEW_DEMO_GROUP_KEY,
        })

      if (eventPromotionCreditError) throw eventPromotionCreditError
    }

    const { data: totals, error: totalsError } = await admin
      .from('partner_point_events')
      .select('business_id, points')
      .eq('reward_period_id', period.id)
      .eq('eligibility_status', 'eligible')
      .eq('is_demo', true)
      .eq('demo_group', LAKEVIEW_DEMO_GROUP_KEY)

    if (totalsError) throw totalsError

    const pointsByBusiness = new Map<string, number>()
    for (const row of totals ?? []) {
      pointsByBusiness.set(
        row.business_id,
        (pointsByBusiness.get(row.business_id) ?? 0) + Number(row.points ?? 0)
      )
    }

    return NextResponse.json({
      ok: true,
      groupKey: LAKEVIEW_DEMO_GROUP_KEY,
      rewardPeriodId: period.id,
      scenarios: demoBusinesses.map((business: any) => ({
        businessName: business.name,
        points: pointsByBusiness.get(business.id) ?? 0,
        profileCompletionTest: business.name === 'Maple Street Coffee Co.',
        eventPromotionSpotlightTest: business.name === 'Maple Street Coffee Co.',
        marketplaceSpendTest: business.name === 'BrightSide Home Services',
      })),
      reconciliation,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown rewards seed failure.'
    console.error('Demo Partner Rewards seed failed', { message })
    return NextResponse.json(
      { error: 'The Partner Rewards demo scenario could not be prepared.' },
      { status: 500 }
    )
  }
}
