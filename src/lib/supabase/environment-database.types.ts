import type { GiftPassDatabase } from './gift-pass-database.types'

type EnvironmentColumns = {
  is_demo: boolean
  demo_group: string | null
}

type ExtendTableWithEnvironment<
  T extends {
    Row: object
    Insert: object
    Update: object
    Relationships: unknown
  },
> = {
  Row: T['Row'] & EnvironmentColumns
  Insert: T['Insert'] & {
    is_demo?: boolean
    demo_group?: string | null
  }
  Update: T['Update'] & {
    is_demo?: boolean
    demo_group?: string | null
  }
  Relationships: T['Relationships']
}

type BaseTables = GiftPassDatabase['public']['Tables']

type EnvironmentTables = Omit<
  BaseTables,
  | 'campaigns'
  | 'organizations'
  | 'businesses'
  | 'offers'
  | 'saved_offers'
  | 'redemptions'
  | 'customer_entitlements'
  | 'checkout_attempts'
> & {
  campaigns: ExtendTableWithEnvironment<BaseTables['campaigns']>
  organizations: ExtendTableWithEnvironment<BaseTables['organizations']>
  businesses: ExtendTableWithEnvironment<BaseTables['businesses']>
  offers: ExtendTableWithEnvironment<BaseTables['offers']>
  saved_offers: ExtendTableWithEnvironment<BaseTables['saved_offers']>
  redemptions: ExtendTableWithEnvironment<BaseTables['redemptions']>
  customer_entitlements: ExtendTableWithEnvironment<
    BaseTables['customer_entitlements']
  >
  checkout_attempts: ExtendTableWithEnvironment<BaseTables['checkout_attempts']>
}

/**
 * Temporary strongly typed bridge for environment-owned tables.
 * Regenerate the canonical Supabase database types from the live project and
 * remove this bridge once every table includes is_demo and demo_group.
 */
export type EnvironmentDatabase = Omit<GiftPassDatabase, 'public'> & {
  public: Omit<GiftPassDatabase['public'], 'Tables'> & {
    Tables: EnvironmentTables
  }
}
