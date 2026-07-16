import type { Database } from './database.types'

// =============================================================================
// Gift Pass database type bridge
// =============================================================================
// This keeps privileged Gift a Pass operations strongly typed until the full
// generated database.types.ts file is refreshed from the live Supabase schema.

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

export type GiftPassDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: Database['public']['Tables'] & {
      gift_passes: GiftPassTable
    }
  }
}
