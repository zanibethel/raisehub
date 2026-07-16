import type { Database } from './database.types'

// =============================================================================
// Extended database type bridge
// =============================================================================
// This keeps newer RaiseHub tables, columns, and functions strongly typed until
// the full generated database.types.ts file is refreshed from the live schema.

type BaseCampaignPurchaseTable =
  Database['public']['Tables']['campaign_purchases']

type BaseProfileTable =
  Database['public']['Tables']['profiles']

type CampaignPurchasePricingSnapshot = {
  organization_pass_earnings: number | null
  pass_price_charged: number | null
  platform_fee_percent: number | null
  pricing_resolved_at: string | null
  pricing_rule_id: string | null
  pricing_scope: string | null
}

type CampaignPurchaseTable = {
  Row:
    BaseCampaignPurchaseTable['Row'] &
    CampaignPurchasePricingSnapshot

  Insert:
    BaseCampaignPurchaseTable['Insert'] & {
      organization_pass_earnings?: number | null
      pass_price_charged?: number | null
      platform_fee_percent?: number | null
      pricing_resolved_at?: string | null
      pricing_rule_id?: string | null
      pricing_scope?: string | null
    }

  Update:
    BaseCampaignPurchaseTable['Update'] & {
      organization_pass_earnings?: number | null
      pass_price_charged?: number | null
      platform_fee_percent?: number | null
      pricing_resolved_at?: string | null
      pricing_rule_id?: string | null
      pricing_scope?: string | null
    }

  Relationships: [
    ...BaseCampaignPurchaseTable['Relationships'],
    {
      foreignKeyName: 'campaign_purchases_pricing_rule_id_fkey'
      columns: ['pricing_rule_id']
      isOneToOne: false
      referencedRelation: 'pricing_rules'
      referencedColumns: ['id']
    },
  ]
}

type ProfileDemoClassification = {
  demo_group: string | null
  is_demo: boolean
}

type ProfileTable = {
  Row:
    BaseProfileTable['Row'] &
    ProfileDemoClassification

  Insert:
    BaseProfileTable['Insert'] & {
      demo_group?: string | null
      is_demo?: boolean
    }

  Update:
    BaseProfileTable['Update'] & {
      demo_group?: string | null
      is_demo?: boolean
    }

  Relationships: BaseProfileTable['Relationships']
}

type GiftPassTable = {
  Row: {
    campaign_id: string
    claim_expires_at: string | null
    claim_token_hash: string | null
    claimed_at: string | null
    claimed_by_user_id: string | null
    created_at: string
    delivered_at: string | null
    delivery_method: string
    demo_group: string | null
    entitlement_id: string | null
    id: string
    is_demo: boolean
    personal_message: string | null
    purchase_id: string | null
    purchaser_user_id: string
    recipient_email: string | null
    recipient_name: string | null
    recipient_phone: string | null
    selected_organization_id: string
    status: string
    updated_at: string
  }

  Insert: {
    campaign_id: string
    claim_expires_at?: string | null
    claim_token_hash?: string | null
    claimed_at?: string | null
    claimed_by_user_id?: string | null
    created_at?: string
    delivered_at?: string | null
    delivery_method?: string
    demo_group?: string | null
    entitlement_id?: string | null
    id?: string
    is_demo?: boolean
    personal_message?: string | null
    purchase_id?: string | null
    purchaser_user_id: string
    recipient_email?: string | null
    recipient_name?: string | null
    recipient_phone?: string | null
    selected_organization_id: string
    status?: string
    updated_at?: string
  }

  Update: {
    campaign_id?: string
    claim_expires_at?: string | null
    claim_token_hash?: string | null
    claimed_at?: string | null
    claimed_by_user_id?: string | null
    created_at?: string
    delivered_at?: string | null
    delivery_method?: string
    demo_group?: string | null
    entitlement_id?: string | null
    id?: string
    is_demo?: boolean
    personal_message?: string | null
    purchase_id?: string | null
    purchaser_user_id?: string
    recipient_email?: string | null
    recipient_name?: string | null
    recipient_phone?: string | null
    selected_organization_id?: string
    status?: string
    updated_at?: string
  }

  Relationships: [
    {
      foreignKeyName: 'gift_passes_campaign_id_fkey'
      columns: ['campaign_id']
      isOneToOne: false
      referencedRelation: 'campaigns'
      referencedColumns: ['id']
    },
    {
      foreignKeyName: 'gift_passes_claimed_by_user_id_fkey'
      columns: ['claimed_by_user_id']
      isOneToOne: false
      referencedRelation: 'profiles'
      referencedColumns: ['id']
    },
    {
      foreignKeyName: 'gift_passes_entitlement_id_fkey'
      columns: ['entitlement_id']
      isOneToOne: false
      referencedRelation: 'customer_entitlements'
      referencedColumns: ['id']
    },
    {
      foreignKeyName: 'gift_passes_purchase_id_fkey'
      columns: ['purchase_id']
      isOneToOne: false
      referencedRelation: 'campaign_purchases'
      referencedColumns: ['id']
    },
    {
      foreignKeyName: 'gift_passes_purchaser_user_id_fkey'
      columns: ['purchaser_user_id']
      isOneToOne: false
      referencedRelation: 'profiles'
      referencedColumns: ['id']
    },
    {
      foreignKeyName: 'gift_passes_selected_organization_id_fkey'
      columns: ['selected_organization_id']
      isOneToOne: false
      referencedRelation: 'profiles'
      referencedColumns: ['id']
    },
  ]
}

type PricingRuleTable = {
  Row: {
    campaign_id: string | null
    created_at: string
    created_by: string | null
    demo_group: string | null
    expires_at: string | null
    id: string
    internal_note: string | null
    is_demo: boolean
    organization_id: string | null
    pass_price: number
    platform_fee_percent: number
    reason: string | null
    scope_type: string
    starts_at: string
    state_code: string | null
    status: string
    town_name: string | null
    updated_at: string
    updated_by: string | null
  }

  Insert: {
    campaign_id?: string | null
    created_at?: string
    created_by?: string | null
    demo_group?: string | null
    expires_at?: string | null
    id?: string
    internal_note?: string | null
    is_demo?: boolean
    organization_id?: string | null
    pass_price: number
    platform_fee_percent: number
    reason?: string | null
    scope_type: string
    starts_at?: string
    state_code?: string | null
    status?: string
    town_name?: string | null
    updated_at?: string
    updated_by?: string | null
  }

  Update: {
    campaign_id?: string | null
    created_at?: string
    created_by?: string | null
    demo_group?: string | null
    expires_at?: string | null
    id?: string
    internal_note?: string | null
    is_demo?: boolean
    organization_id?: string | null
    pass_price?: number
    platform_fee_percent?: number
    reason?: string | null
    scope_type?: string
    starts_at?: string
    state_code?: string | null
    status?: string
    town_name?: string | null
    updated_at?: string
    updated_by?: string | null
  }

  Relationships: [
    {
      foreignKeyName: 'pricing_rules_campaign_id_fkey'
      columns: ['campaign_id']
      isOneToOne: false
      referencedRelation: 'campaigns'
      referencedColumns: ['id']
    },
    {
      foreignKeyName: 'pricing_rules_created_by_fkey'
      columns: ['created_by']
      isOneToOne: false
      referencedRelation: 'profiles'
      referencedColumns: ['id']
    },
    {
      foreignKeyName: 'pricing_rules_organization_id_fkey'
      columns: ['organization_id']
      isOneToOne: false
      referencedRelation: 'organizations'
      referencedColumns: ['id']
    },
    {
      foreignKeyName: 'pricing_rules_updated_by_fkey'
      columns: ['updated_by']
      isOneToOne: false
      referencedRelation: 'profiles'
      referencedColumns: ['id']
    },
  ]
}

type CreateCampaignPurchaseWithEntitlementFunction = {
  Args: {
    p_campaign_id: string
    p_user_id: string
    p_buyer_email: string | null
    p_selected_organization_id: string
    p_donation_amount: number
    p_seller_name: string | null
    p_amount_paid: number
    p_platform_fee: number
    p_organization_earnings: number
    p_is_demo: boolean
    p_demo_group: string | null
    p_grant_entitlement: boolean
    p_pricing_rule_id: string | null
    p_pricing_scope: string | null
    p_pass_price_charged: number | null
    p_platform_fee_percent: number | null
    p_organization_pass_earnings: number | null
    p_pricing_resolved_at: string | null
  }
  Returns: {
    purchase_id: string
    entitlement_id: string | null
    entitlement_starts_at: string | null
    entitlement_expires_at: string | null
  }[]
}

type ExtendedTables = Omit<
  Database['public']['Tables'],
  'campaign_purchases' | 'profiles'
> & {
  campaign_purchases: CampaignPurchaseTable
  profiles: ProfileTable
  gift_passes: GiftPassTable
  pricing_rules: PricingRuleTable
}

type ExtendedFunctions = Database['public']['Functions'] & {
  create_campaign_purchase_with_entitlement:
    CreateCampaignPurchaseWithEntitlementFunction
}

export type GiftPassDatabase = Omit<Database, 'public'> & {
  public: Omit<
    Database['public'],
    'Tables' | 'Functions'
  > & {
    Tables: ExtendedTables
    Functions: ExtendedFunctions
  }
}
