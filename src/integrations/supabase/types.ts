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
      user_permissions: {
        Row: {
          can_add_clients: boolean
          can_assign_clients_to_users: boolean
          can_connect_integrations: boolean
          can_edit_clients: boolean
          can_edit_metrics_override: boolean
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
          can_add_clients?: boolean
          can_assign_clients_to_users?: boolean
          can_connect_integrations?: boolean
          can_edit_clients?: boolean
          can_edit_metrics_override?: boolean
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
          can_add_clients?: boolean
          can_assign_clients_to_users?: boolean
          can_connect_integrations?: boolean
          can_edit_clients?: boolean
          can_edit_metrics_override?: boolean
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
    }
    Views: {
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
    }
    Functions: {
      accept_invitation: {
        Args: { _invitation_id: string }
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
      has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_agency_admin: { Args: { _user_id: string }; Returns: boolean }
      is_agency_member: { Args: { _user_id: string }; Returns: boolean }
      no_admin_exists: { Args: never; Returns: boolean }
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
