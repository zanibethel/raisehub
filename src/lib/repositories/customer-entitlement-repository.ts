import { createClient } from '../supabase/server'
import type { CustomerEntitlementRecord } from '../types/identity-access'

const CUSTOMER_ENTITLEMENT_SELECT_COLUMNS = `
  id,
  user_id,
  purchase_id,
  entitlement_type,
  status,
  starts_at,
  expires_at,
  granted_by,
  revoked_at,
  replacement_entitlement_id,
  created_at,
  updated_at,
  campaign_purchases(payment_status)
`

type RawCustomerEntitlementRecord = Omit<
  CustomerEntitlementRecord,
  'purchase_payment_status'
> & {
  campaign_purchases: { payment_status: string } | null
}

type CustomerEntitlementsResult = {
  entitlements: CustomerEntitlementRecord[]
  error: string | null
}

export async function getCustomerEntitlementsForUser(
  userId: string
): Promise<CustomerEntitlementsResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_entitlements')
    .select(CUSTOMER_ENTITLEMENT_SELECT_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return { entitlements: [], error: error.message }
  }

  const rows = (data ?? []) as unknown as RawCustomerEntitlementRecord[]

  return {
    entitlements: rows.map((row) => ({
      ...row,
      purchase_payment_status:
        row.campaign_purchases?.payment_status ?? null,
    })) as CustomerEntitlementRecord[],
    error: null,
  }
}
