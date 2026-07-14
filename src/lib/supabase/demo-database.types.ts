import type { Database, Json } from './database.types'

// =============================================================================
// Demo Platform table types
// =============================================================================

type DemoGroupsTable = {
  Row: {
    created_at: string
    created_by: string | null
    description: string | null
    group_key: string
    id: string
    is_default: boolean
    metadata: Json
    name: string
    scenario_type: string
    status: string
    updated_at: string
  }
  Insert: {
    created_at?: string
    created_by?: string | null
    description?: string | null
    group_key: string
    id?: string
    is_default?: boolean
    metadata?: Json
    name: string
    scenario_type?: string
    status?: string
    updated_at?: string
  }
  Update: {
    created_at?: string
    created_by?: string | null
    description?: string | null
    group_key?: string
    id?: string
    is_default?: boolean
    metadata?: Json
    name?: string
    scenario_type?: string
    status?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: 'demo_groups_created_by_fkey'
      columns: ['created_by']
      isOneToOne: false
      referencedRelation: 'profiles'
      referencedColumns: ['id']
    },
  ]
}

type DemoProfilesTable = {
  Row: {
    baseline_data: Json
    created_at: string
    demo_group_id: string
    id: string
    is_primary: boolean
    label: string
    metadata: Json
    profile_id: string | null
    role: string
    slug: string
    status: string
    updated_at: string
  }
  Insert: {
    baseline_data?: Json
    created_at?: string
    demo_group_id: string
    id?: string
    is_primary?: boolean
    label: string
    metadata?: Json
    profile_id?: string | null
    role: string
    slug: string
    status?: string
    updated_at?: string
  }
  Update: {
    baseline_data?: Json
    created_at?: string
    demo_group_id?: string
    id?: string
    is_primary?: boolean
    label?: string
    metadata?: Json
    profile_id?: string | null
    role?: string
    slug?: string
    status?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: 'demo_profiles_demo_group_id_fkey'
      columns: ['demo_group_id']
      isOneToOne: false
      referencedRelation: 'demo_groups'
      referencedColumns: ['id']
    },
    {
      foreignKeyName: 'demo_profiles_profile_id_fkey'
      columns: ['profile_id']
      isOneToOne: false
      referencedRelation: 'profiles'
      referencedColumns: ['id']
    },
  ]
}

// =============================================================================
// Supplemental database type
// =============================================================================

export type DemoDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: Database['public']['Tables'] & {
      demo_groups: DemoGroupsTable
      demo_profiles: DemoProfilesTable
    }
  }
}

export type DemoGroupRow =
  DemoGroupsTable['Row']

export type DemoGroupInsert =
  DemoGroupsTable['Insert']

export type DemoGroupUpdate =
  DemoGroupsTable['Update']

export type DemoProfileRow =
  DemoProfilesTable['Row']

export type DemoProfileInsert =
  DemoProfilesTable['Insert']

export type DemoProfileUpdate =
  DemoProfilesTable['Update']
