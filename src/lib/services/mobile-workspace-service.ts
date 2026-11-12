import 'server-only'

import { createClient } from '@supabase/supabase-js'

import {
  applyEnvironmentScope,
  getActiveDataEnvironment,
  recordMatchesEnvironment,
  recordsShareEnvironment,
} from '@/lib/data-environment'
import { isLegacyProfileRole } from '@/lib/rules/identity-access-rules'
import { buildSelectableWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { resolveActorSummaryForActor } from '@/lib/services/capability-resolution-core'
import { toMobileWorkspaces } from '@/lib/mobile/workspace-contract'
import type { Database } from '@/lib/supabase/database.types'
import type {
  BusinessMembershipRow,
  BusinessRow,
  CustomerEntitlementRecord,
  OrganizationMembershipRow,
  OrganizationRow,
} from '@/lib/types/identity-access'

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error || data === null) throw new Error('Mobile workspace lookup failed')
  return data
}

/**
 * Native clients have Supabase access tokens, not the website's auth cookies.
 * These queries use the verified user's JWT and the anon key under existing
 * Supabase RLS. No service-role token or client-provided identity is accepted.
 *
 * This is a read-only transport adapter. Shared capability rules and the
 * canonical workspace builder remain authoritative.
 */
export async function getMobileWorkspaceBootstrap(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) throw new Error('Supabase is not configured')

  const supabase = createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: 'Bearer ' + accessToken } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userResult, error: authError } =
    await supabase.auth.getUser(accessToken)

  if (authError || !userResult.user) return null

  const user = userResult.user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.id !== user.id) {
    throw new Error('Verified user profile unavailable')
  }

  const environment = getActiveDataEnvironment()

  const [
    businessMembershipResult,
    organizationMembershipResult,
    entitlementResult,
    purchaseResult,
  ] = await Promise.all([
    supabase
      .from('business_memberships')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('organization_memberships')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active'),
    applyEnvironmentScope(
      supabase
        .from('customer_entitlements')
        .select('*, campaign_purchases(payment_status,is_demo,demo_group)')
        .eq('user_id', user.id),
      environment
    ),
    applyEnvironmentScope(
      supabase
        .from('campaign_purchases')
        .select('id')
        .eq('user_id', user.id)
        .neq('payment_status', 'failed')
        .limit(1),
      environment
    ),
  ])

  const businessMemberships = requireData(
    businessMembershipResult.data,
    businessMembershipResult.error
  ) as BusinessMembershipRow[]
  const organizationMemberships = requireData(
    organizationMembershipResult.data,
    organizationMembershipResult.error
  ) as OrganizationMembershipRow[]

  const businessIds = [...new Set(businessMemberships.map((m) => m.business_id))]
  const organizationIds = [...new Set(organizationMemberships.map((m) => m.organization_id))]
  const organizationMembershipIds = organizationMemberships.map((m) => m.id)

  const [businessResult, organizationResult, campaignMembershipResult] =
    await Promise.all([
      businessIds.length
        ? supabase.from('businesses').select('*').in('id', businessIds)
        : Promise.resolve({ data: [] as BusinessRow[], error: null }),
      organizationIds.length
        ? supabase.from('organizations').select('*').in('id', organizationIds)
        : Promise.resolve({ data: [] as OrganizationRow[], error: null }),
      organizationMembershipIds.length
        ? supabase
            .from('campaign_memberships')
            .select('*')
            .in('organization_membership_id', organizationMembershipIds)
            .eq('status', 'active')
        : Promise.resolve({ data: [], error: null }),
    ])

  const businesses = requireData(businessResult.data, businessResult.error) as BusinessRow[]
  const organizations = requireData(organizationResult.data, organizationResult.error) as OrganizationRow[]
  const campaignMemberships = requireData(
    campaignMembershipResult.data,
    campaignMembershipResult.error
  )

  const businessesById = new Map(
    businesses
      .filter((business) => recordMatchesEnvironment(business, environment))
      .map((business) => [business.id, business])
  )
  const organizationsById = new Map(
    organizations
      .filter((organization) => recordMatchesEnvironment(organization, environment))
      .map((organization) => [organization.id, organization])
  )

  const businessAccess = businessMemberships.flatMap((membership) => {
    const business = businessesById.get(membership.business_id)
    return business ? [{ business, membership }] : []
  })

  const organizationAccess = organizationMemberships.flatMap((membership) => {
    const organization = organizationsById.get(membership.organization_id)
    return organization ? [{ organization, membership }] : []
  })

  const organizationMembershipsById = new Map(
    organizationAccess.map(({ membership }) => [membership.id, membership])
  )

  const campaignAccess = campaignMemberships.flatMap((campaignMembership) => {
    const organizationMembership = organizationMembershipsById.get(
      campaignMembership.organization_membership_id
    )
    return organizationMembership
      ? [{ campaignMembership, organizationMembership }]
      : []
  })

  type RawEntitlement = Omit<CustomerEntitlementRecord, 'purchase_payment_status'> & {
    is_demo: boolean
    demo_group: string | null
    campaign_purchases:
      | { payment_status: string; is_demo: boolean; demo_group: string | null }
      | null
  }

  const entitlementRows = requireData(
    entitlementResult.data,
    entitlementResult.error
  ) as unknown as RawEntitlement[]

  const customerEntitlements: CustomerEntitlementRecord[] = entitlementRows
    .filter((row) =>
      recordMatchesEnvironment(row, environment) &&
      (!row.purchase_id ||
        (row.campaign_purchases &&
          recordsShareEnvironment(row, row.campaign_purchases)))
    )
    .map((row) => ({
      id: row.id,
      user_id: row.user_id,
      purchase_id: row.purchase_id,
      entitlement_type: row.entitlement_type,
      status: row.status,
      starts_at: row.starts_at,
      expires_at: row.expires_at,
      granted_by: row.granted_by,
      revoked_at: row.revoked_at,
      replacement_entitlement_id: row.replacement_entitlement_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      purchase_payment_status: row.campaign_purchases?.payment_status ?? null,
    }))

  const hasLegacyCustomerPass = requireData(purchaseResult.data, purchaseResult.error).length > 0

  const actor = {
    id: user.id,
    email: profile.email,
    legacyRole: isLegacyProfileRole(profile.role) ? profile.role : null,
  }

  const summary = await resolveActorSummaryForActor(actor, {
    loadBusinessAccess: async () => businessAccess,
    loadOrganizationAccess: async () => organizationAccess,
    loadCampaignAccess: async () => campaignAccess,
    loadCustomerEntitlements: async () => customerEntitlements,
    hasLegacyCustomerPassAccess: async () => hasLegacyCustomerPass,
  })

  return {
    user: { id: user.id, email: user.email ?? null },
    workspaces: toMobileWorkspaces(buildSelectableWorkspaces(summary)),
  }
}
