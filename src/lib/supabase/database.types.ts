export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      business_memberships: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          membership_role: string
          removed_at: string | null
          status: string
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          membership_role: string
          removed_at?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          membership_role?: string
          removed_at?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          archived_at: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          email: string | null
          id: string
          legacy_profile_id: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          phone: string | null
          status: string
          subscription_tier: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          email?: string | null
          id?: string
          legacy_profile_id?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          status?: string
          subscription_tier?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          email?: string | null
          id?: string
          legacy_profile_id?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          status?: string
          subscription_tier?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_legacy_profile_id_fkey"
            columns: ["legacy_profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_memberships: {
        Row: {
          campaign_id: string
          created_at: string
          disabled_at: string | null
          id: string
          joined_at: string
          organization_membership_id: string
          personal_goal: number
          referral_code: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          disabled_at?: string | null
          id?: string
          joined_at?: string
          organization_membership_id: string
          personal_goal?: number
          referral_code?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          disabled_at?: string | null
          id?: string
          joined_at?: string
          organization_membership_id?: string
          personal_goal?: number
          referral_code?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_memberships_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_memberships_organization_membership_id_fkey"
            columns: ["organization_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_purchases: {
        Row: {
          amount_paid: number
          buyer_email: string | null
          campaign_id: string
          created_at: string
          donation_amount: number
          id: string
          organization_earnings: number
          payment_status: string
          platform_fee: number
          selected_organization_id: string | null
          seller_name: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid?: number
          buyer_email?: string | null
          campaign_id: string
          created_at?: string
          donation_amount?: number
          id?: string
          organization_earnings?: number
          payment_status?: string
          platform_fee?: number
          selected_organization_id?: string | null
          seller_name?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          buyer_email?: string | null
          campaign_id?: string
          created_at?: string
          donation_amount?: number
          id?: string
          organization_earnings?: number
          payment_status?: string
          platform_fee?: number
          selected_organization_id?: string | null
          seller_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_purchases_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_purchases_selected_organization_id_fkey"
            columns: ["selected_organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          goal_amount: number | null
          id: string
          name: string
          organization_id: string
          pass_price: number | null
          starts_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          goal_amount?: number | null
          id?: string
          name: string
          organization_id: string
          pass_price?: number | null
          starts_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          goal_amount?: number | null
          id?: string
          name?: string
          organization_id?: string
          pass_price?: number | null
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_entitlements: {
        Row: {
          created_at: string
          entitlement_type: string
          expires_at: string | null
          granted_by: string | null
          id: string
          purchase_id: string | null
          replacement_entitlement_id: string | null
          revoked_at: string | null
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entitlement_type: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          purchase_id?: string | null
          replacement_entitlement_id?: string | null
          revoked_at?: string | null
          starts_at?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entitlement_type?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          purchase_id?: string | null
          replacement_entitlement_id?: string | null
          revoked_at?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_entitlements_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_entitlements_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "campaign_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_entitlements_replacement_fk"
            columns: ["replacement_entitlement_id"]
            isOneToOne: false
            referencedRelation: "customer_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          message: string
          metadata: Json
          read_at: string | null
          severity: string
          source_key: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json
          read_at?: string | null
          severity?: string
          source_key?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json
          read_at?: string | null
          severity?: string
          source_key?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_clicks: {
        Row: {
          click_type: string
          created_at: string
          id: string
          offer_id: string | null
          user_id: string | null
        }
        Insert: {
          click_type: string
          created_at?: string
          id?: string
          offer_id?: string | null
          user_id?: string | null
        }
        Update: {
          click_type?: string
          created_at?: string
          id?: string
          offer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_clicks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_views: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_views_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          discount: string | null
          ends_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          starts_at: string | null
          title: string
          usage_rule: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          discount?: string | null
          ends_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title: string
          usage_rule?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          discount?: string | null
          ends_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title?: string
          usage_rule?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          display_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          membership_role: string
          organization_id: string
          removed_at: string | null
          status: string
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          membership_role: string
          organization_id: string
          removed_at?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          membership_role?: string
          organization_id?: string
          removed_at?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          email: string | null
          id: string
          legacy_profile_id: string | null
          logo_url: string | null
          name: string
          organization_type: string | null
          phone: string | null
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          email?: string | null
          id?: string
          legacy_profile_id?: string | null
          logo_url?: string | null
          name: string
          organization_type?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          email?: string | null
          id?: string
          legacy_profile_id?: string | null
          logo_url?: string | null
          name?: string
          organization_type?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_legacy_profile_id_fkey"
            columns: ["legacy_profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_action_logs: {
        Row: {
          action: string
          actor_user_id: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          reason: string | null
          resource_id: string | null
          resource_type: string | null
          subject_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          resource_id?: string | null
          resource_type?: string | null
          subject_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          resource_id?: string | null
          resource_type?: string | null
          subject_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_action_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_action_logs_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_preview_profiles: {
        Row: {
          created_at: string
          owner_user_id: string
          preview_role: string
          subject_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          owner_user_id: string
          preview_role: string
          subject_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          owner_user_id?: string
          preview_role?: string
          subject_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_preview_profiles_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_preview_profiles_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          business_category: string | null
          business_description: string | null
          business_name: string | null
          created_at: string
          display_name: string | null
          email: string | null
          facebook_url: string | null
          full_name: string | null
          google_maps_url: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          onboarding_completed: boolean
          phone: string | null
          pos_provider: string | null
          redemption_method: string | null
          role: string
          subscription_tier: string
          tiktok_url: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          business_category?: string | null
          business_description?: string | null
          business_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          google_maps_url?: string | null
          id: string
          instagram_url?: string | null
          logo_url?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          pos_provider?: string | null
          redemption_method?: string | null
          role?: string
          subscription_tier?: string
          tiktok_url?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          business_category?: string | null
          business_description?: string | null
          business_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          google_maps_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          pos_provider?: string | null
          redemption_method?: string | null
          role?: string
          subscription_tier?: string
          tiktok_url?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          created_at: string | null
          id: string
          offer_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          offer_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          offer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_offers: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_campaign_recovery_context: {
        Args: {
          p_campaign_id: string
        }
        Returns: {
          campaign_id: string
          organization_legacy_profile_id: string
        }[]
      }
      get_public_campaign_progress: {
        Args: {
          p_campaign_ids: string[]
        }
        Returns: {
          campaign_id: string
          amount_raised: number
        }[]
      }
      is_owner: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
