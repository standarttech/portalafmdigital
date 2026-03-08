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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      ad_accounts: {
        Row: {
          account_name: string | null
          client_id: string
          connection_id: string
          created_at: string
          id: string
          is_active: boolean
          platform_account_id: string
        }
        Insert: {
          account_name?: string | null
          client_id: string
          connection_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          platform_account_id: string
        }
        Update: {
          account_name?: string | null
          client_id?: string
          connection_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          platform_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_level_metrics: {
        Row: {
          ad_account_id: string | null
          add_to_cart: number
          campaign_id: string | null
          checkouts: number
          client_id: string
          created_at: string
          date: string
          id: string
          impressions: number
          leads: number
          level: string
          link_clicks: number
          name: string
          parent_platform_id: string | null
          platform_id: string
          purchases: number
          revenue: number
          spend: number
          status: string
        }
        Insert: {
          ad_account_id?: string | null
          add_to_cart?: number
          campaign_id?: string | null
          checkouts?: number
          client_id: string
          created_at?: string
          date: string
          id?: string
          impressions?: number
          leads?: number
          level?: string
          link_clicks?: number
          name?: string
          parent_platform_id?: string | null
          platform_id: string
          purchases?: number
          revenue?: number
          spend?: number
          status?: string
        }
        Update: {
          ad_account_id?: string | null
          add_to_cart?: number
          campaign_id?: string | null
          checkouts?: number
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          leads?: number
          level?: string
          link_clicks?: number
          name?: string
          parent_platform_id?: string | null
          platform_id?: string
          purchases?: number
          revenue?: number
          spend?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_level_metrics_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_level_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_level_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_approvals: {
        Row: {
          action_type: string
          approved_by: string | null
          created_at: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          payload: Json | null
          requested_by: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          action_type: string
          approved_by?: string | null
          created_at?: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          payload?: Json | null
          requested_by: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          action_type?: string
          approved_by?: string | null
          created_at?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          payload?: Json | null
          requested_by?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      admin_scales: {
        Row: {
          created_at: string
          data: Json
          id: string
          is_current: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          is_current?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          is_current?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      afm_finance_data: {
        Row: {
          created_at: string
          field_name: string
          id: string
          row_id: string
          row_label: string | null
          section: string
          tab_key: string
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          row_id: string
          row_label?: string | null
          section: string
          tab_key: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          row_id?: string
          row_label?: string | null
          section?: string
          tab_key?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: []
      }
      afm_sales_leads: {
        Row: {
          company: string
          created_at: string
          created_by: string | null
          created_date: string
          email: string
          id: string
          name: string
          notes: string
          phone: string
          source: string
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          company?: string
          created_at?: string
          created_by?: string | null
          created_date?: string
          email?: string
          id?: string
          name: string
          notes?: string
          phone?: string
          source?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Update: {
          company?: string
          created_at?: string
          created_by?: string | null
          created_date?: string
          email?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
          source?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      afm_stats_data: {
        Row: {
          created_at: string
          field_name: string
          id: string
          note: string | null
          period_key: string
          stat_type: string
          updated_at: string
          updated_by: string | null
          value: number
          year_range: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          note?: string | null
          period_key: string
          stat_type: string
          updated_at?: string
          updated_by?: string | null
          value?: number
          year_range: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          note?: string | null
          period_key?: string
          stat_type?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
          year_range?: string
        }
        Relationships: []
      }
      afm_stats_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          new_value: number
          old_value: number | null
          period_key: string
          stat_type: string
          year_range: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          new_value: number
          old_value?: number | null
          period_key: string
          stat_type: string
          year_range: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: number
          old_value?: number | null
          period_key?: string
          stat_type?: string
          year_range?: string
        }
        Relationships: []
      }
      agency_users: {
        Row: {
          agency_role: Database["public"]["Enums"]["agency_role"]
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_role?: Database["public"]["Enums"]["agency_role"]
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_role?: Database["public"]["Enums"]["agency_role"]
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      annotations: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          text: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          text: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "annotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      budget_plans: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          month: string
          notes: string | null
          planned_cpl: number | null
          planned_leads: number
          planned_spend: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          month: string
          notes?: string | null
          planned_cpl?: number | null
          planned_leads?: number
          planned_spend?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          month?: string
          notes?: string | null
          planned_cpl?: number | null
          planned_leads?: number
          planned_spend?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ad_account_id: string
          campaign_name: string
          client_id: string
          created_at: string
          id: string
          platform_campaign_id: string
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          campaign_name: string
          client_id: string
          created_at?: string
          id?: string
          platform_campaign_id: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          campaign_name?: string
          client_id?: string
          created_at?: string
          id?: string
          platform_campaign_id?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          can_write: boolean
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          can_write?: boolean
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          can_write?: boolean
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_comments: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_comments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_info: {
        Row: {
          additional_notes: string | null
          brand_guidelines_url: string | null
          brief_url: string | null
          business_niche: string | null
          client_id: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          crm_system: string | null
          facebook_url: string | null
          geo_targeting: string | null
          id: string
          instagram_url: string | null
          key_competitors: string | null
          landing_pages: string | null
          linkedin_url: string | null
          monthly_budget: number | null
          payment_terms: string | null
          target_audience: string | null
          telegram_url: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          additional_notes?: string | null
          brand_guidelines_url?: string | null
          brief_url?: string | null
          business_niche?: string | null
          client_id: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          crm_system?: string | null
          facebook_url?: string | null
          geo_targeting?: string | null
          id?: string
          instagram_url?: string | null
          key_competitors?: string | null
          landing_pages?: string | null
          linkedin_url?: string | null
          monthly_budget?: number | null
          payment_terms?: string | null
          target_audience?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          additional_notes?: string | null
          brand_guidelines_url?: string | null
          brief_url?: string | null
          business_niche?: string | null
          client_id?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          crm_system?: string | null
          facebook_url?: string | null
          geo_targeting?: string | null
          id?: string
          instagram_url?: string | null
          key_competitors?: string | null
          landing_pages?: string | null
          linkedin_url?: string | null
          monthly_budget?: number | null
          payment_terms?: string | null
          target_audience?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_info_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          client_id: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          client_id: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          client_id?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_status_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_table_presets: {
        Row: {
          client_id: string
          columns: Json
          created_at: string
          id: string
          is_default: boolean
          preset_name: string
        }
        Insert: {
          client_id: string
          columns?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          preset_name?: string
        }
        Update: {
          client_id?: string
          columns?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          preset_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_table_presets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_targets: {
        Row: {
          client_id: string
          created_at: string
          id: string
          target_cpl: number | null
          target_ctr: number | null
          target_leads: number | null
          target_roas: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          target_cpl?: number | null
          target_ctr?: number | null
          target_leads?: number | null
          target_roas?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          target_cpl?: number | null
          target_ctr?: number | null
          target_leads?: number | null
          target_roas?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_webhooks: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          events: string[]
          failure_count: number
          headers: Json | null
          id: string
          is_active: boolean
          last_status_code: number | null
          last_triggered_at: string | null
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          events?: string[]
          failure_count?: number
          headers?: Json | null
          id?: string
          is_active?: boolean
          last_status_code?: number | null
          last_triggered_at?: string | null
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          events?: string[]
          failure_count?: number
          headers?: Json | null
          id?: string
          is_active?: boolean
          last_status_code?: number | null
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_webhooks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          auto_sync_enabled: boolean
          category: string
          created_at: string
          currency: string
          google_sheet_url: string | null
          id: string
          logo_url: string | null
          meta_sheet_url: string | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["client_status"]
          tiktok_sheet_url: string | null
          timezone: string
          updated_at: string
          visible_columns: Json | null
        }
        Insert: {
          auto_sync_enabled?: boolean
          category?: string
          created_at?: string
          currency?: string
          google_sheet_url?: string | null
          id?: string
          logo_url?: string | null
          meta_sheet_url?: string | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tiktok_sheet_url?: string | null
          timezone?: string
          updated_at?: string
          visible_columns?: Json | null
        }
        Update: {
          auto_sync_enabled?: boolean
          category?: string
          created_at?: string
          currency?: string
          google_sheet_url?: string | null
          id?: string
          logo_url?: string | null
          meta_sheet_url?: string | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tiktok_sheet_url?: string | null
          timezone?: string
          updated_at?: string
          visible_columns?: Json | null
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          budget: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          website: string | null
        }
        Insert: {
          budget?: string | null
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          website?: string | null
        }
        Update: {
          budget?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      crm_bot_profiles: {
        Row: {
          bot_name: string
          bot_token_ref: string | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          bot_name?: string
          bot_token_ref?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          bot_name?: string
          bot_token_ref?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_bot_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_custom_fields: {
        Row: {
          client_id: string
          created_at: string
          field_type: string
          id: string
          is_required: boolean
          key: string
          name: string
          options: Json | null
          pipeline_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean
          key: string
          name: string
          options?: Json | null
          pipeline_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean
          key?: string
          name?: string
          options?: Json | null
          pipeline_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_custom_fields_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_custom_fields_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_activities: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          payload: Json
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          payload?: Json
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          payload?: Json
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_custom_field_values: {
        Row: {
          created_at: string
          custom_field_id: string
          id: string
          lead_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          custom_field_id: string
          id?: string
          lead_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          custom_field_id?: string
          id?: string
          lead_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "crm_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_custom_field_values_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          lead_id: string
          note: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          lead_id: string
          note: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          ad_name: string | null
          adset_name: string | null
          assignee_id: string | null
          campaign_name: string | null
          client_id: string
          company: string
          created_at: string
          duplicate_of: string | null
          email: string
          external_lead_id: string | null
          first_name: string
          form_name: string | null
          full_name: string
          id: string
          is_duplicate: boolean
          landing_page: string | null
          last_name: string
          lost_at: string | null
          lost_reason: string | null
          notes_summary: string
          phone: string
          pipeline_id: string
          priority: string
          raw_payload: Json | null
          source: string
          stage_id: string
          status: string
          tags: string[]
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: number
          won_at: string | null
          won_reason: string | null
        }
        Insert: {
          ad_name?: string | null
          adset_name?: string | null
          assignee_id?: string | null
          campaign_name?: string | null
          client_id: string
          company?: string
          created_at?: string
          duplicate_of?: string | null
          email?: string
          external_lead_id?: string | null
          first_name?: string
          form_name?: string | null
          full_name?: string
          id?: string
          is_duplicate?: boolean
          landing_page?: string | null
          last_name?: string
          lost_at?: string | null
          lost_reason?: string | null
          notes_summary?: string
          phone?: string
          pipeline_id: string
          priority?: string
          raw_payload?: Json | null
          source?: string
          stage_id: string
          status?: string
          tags?: string[]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number
          won_at?: string | null
          won_reason?: string | null
        }
        Update: {
          ad_name?: string | null
          adset_name?: string | null
          assignee_id?: string | null
          campaign_name?: string | null
          client_id?: string
          company?: string
          created_at?: string
          duplicate_of?: string | null
          email?: string
          external_lead_id?: string | null
          first_name?: string
          form_name?: string | null
          full_name?: string
          id?: string
          is_duplicate?: boolean
          landing_page?: string | null
          last_name?: string
          lost_at?: string | null
          lost_reason?: string | null
          notes_summary?: string
          phone?: string
          pipeline_id?: string
          priority?: string
          raw_payload?: Json | null
          source?: string
          stage_id?: string
          status?: string
          tags?: string[]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number
          won_at?: string | null
          won_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_booked_stage: boolean
          is_closed_stage: boolean
          is_lost_stage: boolean
          is_qualified_stage: boolean
          is_won_stage: boolean
          name: string
          pipeline_id: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_booked_stage?: boolean
          is_closed_stage?: boolean
          is_lost_stage?: boolean
          is_qualified_stage?: boolean
          is_won_stage?: boolean
          name: string
          pipeline_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_booked_stage?: boolean
          is_closed_stage?: boolean
          is_lost_stage?: boolean
          is_qualified_stage?: boolean
          is_won_stage?: boolean
          name?: string
          pipeline_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhook_endpoints: {
        Row: {
          client_id: string
          created_at: string
          default_stage_id: string | null
          endpoint_slug: string
          field_mapping: Json
          id: string
          is_active: boolean
          name: string
          pipeline_id: string
          secret_key: string
          source_label: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          default_stage_id?: string | null
          endpoint_slug?: string
          field_mapping?: Json
          id?: string
          is_active?: boolean
          name?: string
          pipeline_id: string
          secret_key?: string
          source_label?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          default_stage_id?: string | null
          endpoint_slug?: string
          field_mapping?: Json
          id?: string
          is_active?: boolean
          name?: string
          pipeline_id?: string
          secret_key?: string
          source_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhook_endpoints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_webhook_endpoints_default_stage_id_fkey"
            columns: ["default_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_webhook_endpoints_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhook_logs: {
        Row: {
          created_at: string
          endpoint_id: string
          id: string
          request_payload: Json | null
          response_message: string | null
          status: string
        }
        Insert: {
          created_at?: string
          endpoint_id: string
          id?: string
          request_payload?: Json | null
          response_message?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          endpoint_id?: string
          id?: string
          request_payload?: Json | null
          response_message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhook_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "crm_webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          add_to_cart: number | null
          campaign_id: string
          checkouts: number | null
          client_id: string
          created_at: string
          date: string
          id: string
          impressions: number
          leads: number
          link_clicks: number
          purchases: number | null
          revenue: number | null
          spend: number
        }
        Insert: {
          add_to_cart?: number | null
          campaign_id: string
          checkouts?: number | null
          client_id: string
          created_at?: string
          date: string
          id?: string
          impressions?: number
          leads?: number
          link_clicks?: number
          purchases?: number | null
          revenue?: number | null
          spend?: number
        }
        Update: {
          add_to_cart?: number | null
          campaign_id?: string
          checkouts?: number | null
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          leads?: number
          link_clicks?: number
          purchases?: number | null
          revenue?: number | null
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          permissions: Json | null
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          permissions?: Json | null
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          permissions?: Json | null
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_overrides: {
        Row: {
          campaign_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          date: string
          field_name: string
          id: string
          override_value: number
          reason: string | null
        }
        Insert: {
          campaign_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          date: string
          field_name: string
          id?: string
          override_value: number
          reason?: string | null
        }
        Update: {
          campaign_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          field_name?: string
          id?: string
          override_value?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metric_overrides_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_overrides_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_broadcasts: {
        Row: {
          body: string
          channels: string[]
          created_at: string
          created_by: string
          id: string
          recipients_filter: string
          sent_at: string | null
          subject: string
        }
        Insert: {
          body: string
          channels?: string[]
          created_at?: string
          created_by: string
          id?: string
          recipients_filter?: string
          sent_at?: string | null
          subject: string
        }
        Update: {
          body?: string
          channels?: string[]
          created_at?: string
          created_by?: string
          id?: string
          recipients_filter?: string
          sent_at?: string | null
          subject?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          alert_channels: string[]
          approval_channels: string[]
          chat_channels: string[]
          created_at: string
          email_enabled: boolean
          id: string
          report_channels: string[]
          task_channels: string[]
          telegram_chat_id: string | null
          telegram_enabled: boolean
          telegram_link_code: string | null
          updated_at: string
          user_id: string
          webpush_enabled: boolean
          webpush_subscription: Json | null
        }
        Insert: {
          alert_channels?: string[]
          approval_channels?: string[]
          chat_channels?: string[]
          created_at?: string
          email_enabled?: boolean
          id?: string
          report_channels?: string[]
          task_channels?: string[]
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          telegram_link_code?: string | null
          updated_at?: string
          user_id: string
          webpush_enabled?: boolean
          webpush_subscription?: Json | null
        }
        Update: {
          alert_channels?: string[]
          approval_channels?: string[]
          chat_channels?: string[]
          created_at?: string
          email_enabled?: boolean
          id?: string
          report_channels?: string[]
          task_channels?: string[]
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          telegram_link_code?: string | null
          updated_at?: string
          user_id?: string
          webpush_enabled?: boolean
          webpush_subscription?: Json | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          account_name: string | null
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          sync_error: string | null
          sync_status: Database["public"]["Enums"]["sync_status"]
          token_reference: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          token_reference?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          token_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      project_events: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          title: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          title: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_api_logs: {
        Row: {
          client_id: string | null
          created_at: string
          duration_ms: number | null
          endpoint: string | null
          error_message: string | null
          id: string
          platform: Database["public"]["Enums"]["platform_type"] | null
          request_body: Json | null
          response_body: Json | null
          status_code: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["platform_type"] | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["platform_type"] | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_api_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          created_by: string | null
          default_sections: Json
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_sections?: Json
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_sections?: Json
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          client_id: string
          content: Json | null
          created_at: string
          created_by: string | null
          date_from: string
          date_to: string
          id: string
          pdf_url: string | null
          status: Database["public"]["Enums"]["report_status"]
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content?: Json | null
          created_at?: string
          created_by?: string | null
          date_from: string
          date_to: string
          id?: string
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: Json | null
          created_at?: string
          created_by?: string | null
          date_from?: string
          date_to?: string
          id?: string
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          day_of_month: number | null
          day_of_week: number | null
          enabled: boolean
          frequency: string
          id: string
          last_sent_at: string | null
          recipients: Json
          scope: string
          send_time: string
          template_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_at?: string | null
          recipients?: Json
          scope?: string
          send_time?: string
          template_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_at?: string | null
          recipients?: Json
          scope?: string
          send_time?: string
          template_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_connections: {
        Row: {
          access_token: string
          connected_at: string
          connected_by: string
          id: string
          ig_user_id: string | null
          is_active: boolean
          last_refreshed_at: string | null
          page_id: string | null
          page_name: string | null
          platform: string
          token_expires_at: string | null
          token_reference: string | null
        }
        Insert: {
          access_token: string
          connected_at?: string
          connected_by: string
          id?: string
          ig_user_id?: string | null
          is_active?: boolean
          last_refreshed_at?: string | null
          page_id?: string | null
          page_name?: string | null
          platform: string
          token_expires_at?: string | null
          token_reference?: string | null
        }
        Update: {
          access_token?: string
          connected_at?: string
          connected_by?: string
          id?: string
          ig_user_id?: string | null
          is_active?: boolean
          last_refreshed_at?: string | null
          page_id?: string | null
          page_name?: string | null
          platform?: string
          token_expires_at?: string | null
          token_reference?: string | null
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          checklist: Json | null
          created_at: string
          description: string | null
          id: string
          title: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_access_adminscale: boolean
          can_access_afm_internal: boolean
          can_access_crm: boolean
          can_add_clients: boolean
          can_assign_clients_to_users: boolean
          can_connect_integrations: boolean
          can_edit_clients: boolean
          can_edit_metrics_override: boolean
          can_manage_crm_integrations: boolean
          can_manage_tasks: boolean
          can_publish_reports: boolean
          can_run_manual_sync: boolean
          can_view_audit_log: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access_adminscale?: boolean
          can_access_afm_internal?: boolean
          can_access_crm?: boolean
          can_add_clients?: boolean
          can_assign_clients_to_users?: boolean
          can_connect_integrations?: boolean
          can_edit_clients?: boolean
          can_edit_metrics_override?: boolean
          can_manage_crm_integrations?: boolean
          can_manage_tasks?: boolean
          can_publish_reports?: boolean
          can_run_manual_sync?: boolean
          can_view_audit_log?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access_adminscale?: boolean
          can_access_afm_internal?: boolean
          can_access_crm?: boolean
          can_add_clients?: boolean
          can_assign_clients_to_users?: boolean
          can_connect_integrations?: boolean
          can_edit_clients?: boolean
          can_edit_metrics_override?: boolean
          can_manage_crm_integrations?: boolean
          can_manage_tasks?: boolean
          can_publish_reports?: boolean
          can_run_manual_sync?: boolean
          can_view_audit_log?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          current_page: string | null
          is_online: boolean
          last_seen_at: string
          user_id: string
        }
        Insert: {
          current_page?: string | null
          is_online?: boolean
          last_seen_at?: string
          user_id: string
        }
        Update: {
          current_page?: string | null
          is_online?: boolean
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          bypass_dual_approval: boolean
          created_at: string
          force_password_change: boolean
          id: string
          language: string
          needs_password_setup: boolean
          temp_password_expires_at: string | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bypass_dual_approval?: boolean
          created_at?: string
          force_password_change?: boolean
          id?: string
          language?: string
          needs_password_setup?: boolean
          temp_password_expires_at?: string | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bypass_dual_approval?: boolean
          created_at?: string
          force_password_change?: boolean
          id?: string
          language?: string
          needs_password_setup?: boolean
          temp_password_expires_at?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          response_body: string | null
          response_status: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "client_webhooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "client_webhooks_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      client_webhooks_safe: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          events: string[] | null
          failure_count: number | null
          has_secret: boolean | null
          headers: Json | null
          id: string | null
          is_active: boolean | null
          last_status_code: number | null
          last_triggered_at: string | null
          name: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          events?: string[] | null
          failure_count?: number | null
          has_secret?: never
          headers?: Json | null
          id?: string | null
          is_active?: boolean | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          name?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          events?: string[] | null
          failure_count?: number | null
          has_secret?: never
          headers?: Json | null
          id?: string | null
          is_active?: boolean | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          name?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_webhooks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections_safe: {
        Row: {
          account_name: string | null
          client_id: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          last_sync_at: string | null
          platform: Database["public"]["Enums"]["platform_type"] | null
          sync_error: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"] | null
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"] | null
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_connections_safe: {
        Row: {
          connected_at: string | null
          connected_by: string | null
          id: string | null
          ig_user_id: string | null
          is_active: boolean | null
          last_refreshed_at: string | null
          page_id: string | null
          page_name: string | null
          platform: string | null
          token_expires_at: string | null
        }
        Insert: {
          connected_at?: string | null
          connected_by?: string | null
          id?: string | null
          ig_user_id?: string | null
          is_active?: boolean | null
          last_refreshed_at?: string | null
          page_id?: string | null
          page_name?: string | null
          platform?: string | null
          token_expires_at?: string | null
        }
        Update: {
          connected_at?: string | null
          connected_by?: string | null
          id?: string | null
          ig_user_id?: string | null
          is_active?: boolean | null
          last_refreshed_at?: string | null
          page_id?: string | null
          page_name?: string | null
          platform?: string | null
          token_expires_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { _invitation_id: string }
        Returns: undefined
      }
      delete_social_token: {
        Args: { _token_reference: string }
        Returns: undefined
      }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          role: string
          status: string
        }[]
      }
      get_invitation_details: {
        Args: { _invitation_id: string }
        Returns: {
          client_id: string
          permissions: Json
        }[]
      }
      get_social_token: { Args: { _token_reference: string }; Returns: string }
      has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_agency_admin: { Args: { _user_id: string }; Returns: boolean }
      is_agency_member: { Args: { _user_id: string }; Returns: boolean }
      no_admin_exists: { Args: never; Returns: boolean }
      store_social_token: {
        Args: { _secret_name: string; _secret_value: string }
        Returns: string
      }
      upsert_afm_stat: {
        Args: {
          _field_name: string
          _note?: string
          _period_key: string
          _stat_type: string
          _value: number
          _year_range: string
        }
        Returns: undefined
      }
      upsert_finance_data: {
        Args: {
          _field_name: string
          _row_id: string
          _row_label: string
          _section: string
          _tab_key: string
          _value: number
        }
        Returns: undefined
      }
    }
    Enums: {
      agency_role:
        | "AgencyAdmin"
        | "MediaBuyer"
        | "Client"
        | "Manager"
        | "SalesManager"
        | "AccountManager"
        | "Designer"
        | "Copywriter"
      campaign_status: "active" | "paused" | "archived"
      client_role: "Client"
      client_status: "active" | "inactive" | "paused" | "onboarding" | "stop"
      platform_type: "meta" | "google" | "tiktok"
      report_status: "draft" | "published"
      sync_status: "idle" | "running" | "success" | "error"
      task_status: "pending" | "in_progress" | "completed"
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
    Enums: {
      agency_role: [
        "AgencyAdmin",
        "MediaBuyer",
        "Client",
        "Manager",
        "SalesManager",
        "AccountManager",
        "Designer",
        "Copywriter",
      ],
      campaign_status: ["active", "paused", "archived"],
      client_role: ["Client"],
      client_status: ["active", "inactive", "paused", "onboarding", "stop"],
      platform_type: ["meta", "google", "tiktok"],
      report_status: ["draft", "published"],
      sync_status: ["idle", "running", "success", "error"],
      task_status: ["pending", "in_progress", "completed"],
    },
  },
} as const
