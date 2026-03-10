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
      ai_analysis_runs: {
        Row: {
          ad_account_id: string | null
          analysis_type: string
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          model_used: string | null
          prompt: string
          result_data: Json | null
          result_summary: string | null
          session_id: string
          status: string
        }
        Insert: {
          ad_account_id?: string | null
          analysis_type?: string
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          model_used?: string | null
          prompt?: string
          result_data?: Json | null
          result_summary?: string | null
          session_id: string
          status?: string
        }
        Update: {
          ad_account_id?: string | null
          analysis_type?: string
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          model_used?: string | null
          prompt?: string
          result_data?: Json | null
          result_summary?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_runs_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_campaign_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_campaign_sessions: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          session_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json | null
          session_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          session_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_campaign_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_health_checks: {
        Row: {
          checked_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          metadata: Json | null
          provider_id: string
          status: string
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          provider_id: string
          status?: string
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          provider_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_health_checks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_routes: {
        Row: {
          created_at: string
          fallback_provider_id: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          model_override: string | null
          primary_provider_id: string
          priority: number
          retry_limit: number
          task_type: string
          timeout_seconds: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fallback_provider_id?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          model_override?: string | null
          primary_provider_id: string
          priority?: number
          retry_limit?: number
          task_type: string
          timeout_seconds?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fallback_provider_id?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          model_override?: string | null
          primary_provider_id?: string
          priority?: number
          retry_limit?: number
          task_type?: string
          timeout_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_routes_fallback_provider_id_fkey"
            columns: ["fallback_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_provider_routes_primary_provider_id_fkey"
            columns: ["primary_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_secrets: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          secret_label: string
          secret_ref: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          secret_label?: string
          secret_ref?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          secret_label?: string
          secret_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_secrets_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          auth_type: string
          base_url: string | null
          category: string
          created_at: string
          created_by: string
          default_model: string | null
          id: string
          is_active: boolean
          is_default: boolean
          last_test_error: string | null
          last_test_status: string | null
          last_tested_at: string | null
          metadata: Json | null
          name: string
          provider_type: string
          slug: string
          supports_chat: boolean
          supports_images: boolean
          supports_structured_output: boolean
          supports_text: boolean
          supports_workflows: boolean
          updated_at: string
        }
        Insert: {
          auth_type?: string
          base_url?: string | null
          category?: string
          created_at?: string
          created_by: string
          default_model?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          metadata?: Json | null
          name: string
          provider_type?: string
          slug: string
          supports_chat?: boolean
          supports_images?: boolean
          supports_structured_output?: boolean
          supports_text?: boolean
          supports_workflows?: boolean
          updated_at?: string
        }
        Update: {
          auth_type?: string
          base_url?: string | null
          category?: string
          created_at?: string
          created_by?: string
          default_model?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          metadata?: Json | null
          name?: string
          provider_type?: string
          slug?: string
          supports_chat?: boolean
          supports_images?: boolean
          supports_structured_output?: boolean
          supports_text?: boolean
          supports_workflows?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          acted_on_at: string | null
          analysis_run_id: string | null
          client_id: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          priority: string
          recommendation_type: string
          session_id: string | null
          status: string
          title: string
        }
        Insert: {
          acted_on_at?: string | null
          analysis_run_id?: string | null
          client_id: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string
          recommendation_type?: string
          session_id?: string | null
          status?: string
          title: string
        }
        Update: {
          acted_on_at?: string | null
          analysis_run_id?: string | null
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string
          recommendation_type?: string
          session_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_campaign_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_task_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          provider_id: string | null
          step_type: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          provider_id?: string | null
          step_type?: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          provider_id?: string | null
          step_type?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_task_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_task_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          input_template: Json | null
          is_active: boolean
          metadata: Json | null
          name: string
          task_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          input_template?: Json | null
          is_active?: boolean
          metadata?: Json | null
          name: string
          task_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          input_template?: Json | null
          is_active?: boolean
          metadata?: Json | null
          name?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_tasks: {
        Row: {
          attempt_count: number
          client_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed_at: string | null
          id: string
          input_payload: Json | null
          metadata: Json | null
          normalized_input: Json | null
          output_payload: Json | null
          provider_route_id: string | null
          requested_by: string
          selected_provider_id: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          source_module: string
          started_at: string | null
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          input_payload?: Json | null
          metadata?: Json | null
          normalized_input?: Json | null
          output_payload?: Json | null
          provider_route_id?: string | null
          requested_by: string
          selected_provider_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_module?: string
          started_at?: string | null
          status?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          input_payload?: Json | null
          metadata?: Json | null
          normalized_input?: Json | null
          output_payload?: Json | null
          provider_route_id?: string | null
          requested_by?: string
          selected_provider_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_module?: string
          started_at?: string | null
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_provider_route_id_fkey"
            columns: ["provider_route_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_selected_provider_id_fkey"
            columns: ["selected_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
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
      campaign_draft_items: {
        Row: {
          config: Json | null
          created_at: string
          creative_asset_id: string | null
          draft_id: string
          id: string
          item_type: string
          name: string
          parent_item_id: string | null
          position: number
          sort_order: number
          status: string
          updated_at: string
          validation_errors: Json | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          creative_asset_id?: string | null
          draft_id: string
          id?: string
          item_type?: string
          name: string
          parent_item_id?: string | null
          position?: number
          sort_order?: number
          status?: string
          updated_at?: string
          validation_errors?: Json | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          creative_asset_id?: string | null
          draft_id?: string
          id?: string
          item_type?: string
          name?: string
          parent_item_id?: string | null
          position?: number
          sort_order?: number
          status?: string
          updated_at?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_draft_items_creative_asset_id_fkey"
            columns: ["creative_asset_id"]
            isOneToOne: false
            referencedRelation: "creative_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_draft_items_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "campaign_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_draft_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "campaign_draft_items"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_drafts: {
        Row: {
          ad_account_id: string | null
          bid_strategy: string
          budget_mode: string
          buying_type: string
          campaign_name: string
          client_id: string
          config: Json | null
          created_at: string
          created_by: string
          draft_type: string
          hypothesis_id: string | null
          id: string
          metadata: Json | null
          name: string
          notes: string | null
          objective: string
          platform: string
          preview_payload: Json | null
          recommendation_id: string | null
          session_id: string | null
          source_entity_id: string | null
          source_type: string
          status: string
          total_budget: number
          updated_at: string
          validation_errors: Json | null
          validation_status: string
        }
        Insert: {
          ad_account_id?: string | null
          bid_strategy?: string
          budget_mode?: string
          buying_type?: string
          campaign_name?: string
          client_id: string
          config?: Json | null
          created_at?: string
          created_by: string
          draft_type?: string
          hypothesis_id?: string | null
          id?: string
          metadata?: Json | null
          name: string
          notes?: string | null
          objective?: string
          platform?: string
          preview_payload?: Json | null
          recommendation_id?: string | null
          session_id?: string | null
          source_entity_id?: string | null
          source_type?: string
          status?: string
          total_budget?: number
          updated_at?: string
          validation_errors?: Json | null
          validation_status?: string
        }
        Update: {
          ad_account_id?: string | null
          bid_strategy?: string
          budget_mode?: string
          buying_type?: string
          campaign_name?: string
          client_id?: string
          config?: Json | null
          created_at?: string
          created_by?: string
          draft_type?: string
          hypothesis_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          notes?: string | null
          objective?: string
          platform?: string
          preview_payload?: Json | null
          recommendation_id?: string | null
          session_id?: string | null
          source_entity_id?: string | null
          source_type?: string
          status?: string
          total_budget?: number
          updated_at?: string
          validation_errors?: Json | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_drafts_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_drafts_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "hypothesis_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_drafts_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_drafts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_campaign_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_performance_snapshots: {
        Row: {
          clicks: number
          client_id: string
          cpc: number
          created_at: string
          ctr: number
          date_window_end: string | null
          date_window_start: string | null
          entity_level: string
          entity_name: string | null
          entity_status: string | null
          external_ad_id: string | null
          external_adset_id: string | null
          external_campaign_id: string | null
          id: string
          impressions: number
          launch_request_id: string | null
          leads: number
          metadata: Json | null
          platform: string
          purchases: number
          revenue: number
          spend: number
          synced_at: string
        }
        Insert: {
          clicks?: number
          client_id: string
          cpc?: number
          created_at?: string
          ctr?: number
          date_window_end?: string | null
          date_window_start?: string | null
          entity_level?: string
          entity_name?: string | null
          entity_status?: string | null
          external_ad_id?: string | null
          external_adset_id?: string | null
          external_campaign_id?: string | null
          id?: string
          impressions?: number
          launch_request_id?: string | null
          leads?: number
          metadata?: Json | null
          platform?: string
          purchases?: number
          revenue?: number
          spend?: number
          synced_at?: string
        }
        Update: {
          clicks?: number
          client_id?: string
          cpc?: number
          created_at?: string
          ctr?: number
          date_window_end?: string | null
          date_window_start?: string | null
          entity_level?: string
          entity_name?: string | null
          entity_status?: string | null
          external_ad_id?: string | null
          external_adset_id?: string | null
          external_campaign_id?: string | null
          id?: string
          impressions?: number
          launch_request_id?: string | null
          leads?: number
          metadata?: Json | null
          platform?: string
          purchases?: number
          revenue?: number
          spend?: number
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_performance_snapshots_client_id_fkey"
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
      chat_read_status: {
        Row: {
          last_read_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_status_room_id_fkey"
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
      client_capi_config: {
        Row: {
          access_token_ref: string | null
          client_id: string
          created_at: string | null
          event_mapping: Json | null
          id: string
          is_active: boolean | null
          pixel_id: string
          test_event_code: string | null
          updated_at: string | null
        }
        Insert: {
          access_token_ref?: string | null
          client_id: string
          created_at?: string | null
          event_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          pixel_id: string
          test_event_code?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token_ref?: string | null
          client_id?: string
          created_at?: string | null
          event_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          pixel_id?: string
          test_event_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_capi_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
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
      client_portal_branding: {
        Row: {
          accent_color: string | null
          agency_label: string | null
          client_id: string | null
          created_at: string
          id: string
          logo_url: string | null
          portal_title: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          agency_label?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          portal_title?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          agency_label?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          portal_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_branding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_files: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          external_url: string | null
          file_type: string
          id: string
          is_visible_in_portal: boolean
          storage_path: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_type?: string
          id?: string
          is_visible_in_portal?: boolean
          storage_path?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_type?: string
          id?: string
          is_visible_in_portal?: boolean
          storage_path?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_invites: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_invites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_users: {
        Row: {
          activated_at: string | null
          client_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          invited_at: string
          last_login_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          client_id: string
          created_at?: string
          email: string
          full_name?: string
          id?: string
          invited_at?: string
          last_login_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          client_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invited_at?: string
          last_login_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
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
      creative_assets: {
        Row: {
          asset_type: string
          client_id: string
          created_at: string
          created_by: string
          file_path: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          name: string
          notes: string | null
          status: string
          tags: string[] | null
          updated_at: string
          url: string | null
        }
        Insert: {
          asset_type?: string
          client_id: string
          created_at?: string
          created_by: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          notes?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          asset_type?: string
          client_id?: string
          created_at?: string
          created_by?: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          notes?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      crm_external_connections: {
        Row: {
          api_key_ref: string | null
          base_url: string | null
          client_id: string
          created_at: string
          field_mapping: Json
          id: string
          is_active: boolean
          label: string
          last_sync_error: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          provider: string
          sync_enabled: boolean
          sync_interval_minutes: number
          updated_at: string
        }
        Insert: {
          api_key_ref?: string | null
          base_url?: string | null
          client_id: string
          created_at?: string
          field_mapping?: Json
          id?: string
          is_active?: boolean
          label?: string
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          provider?: string
          sync_enabled?: boolean
          sync_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          api_key_ref?: string | null
          base_url?: string | null
          client_id?: string
          created_at?: string
          field_mapping?: Json
          id?: string
          is_active?: boolean
          label?: string
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          provider?: string
          sync_enabled?: boolean
          sync_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_external_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          {
            foreignKeyName: "crm_webhook_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "crm_webhook_endpoints_safe"
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
      gos_analytics_events: {
        Row: {
          client_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          referrer: string | null
          user_agent: string | null
          variant_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          referrer?: string | null
          user_agent?: string | null
          variant_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          referrer?: string | null
          user_agent?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gos_analytics_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      gos_audit_log: {
        Row: {
          action_type: string
          actor_role: string | null
          actor_user_id: string | null
          after_summary: Json | null
          before_summary: Json | null
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action_type: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_summary?: Json | null
          before_summary?: Json | null
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action_type?: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_summary?: Json | null
          before_summary?: Json | null
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      gos_experiments: {
        Row: {
          created_at: string
          created_by: string | null
          entity_type: string
          id: string
          name: string
          status: string
          traffic_split: Json
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_type?: string
          id?: string
          name?: string
          status?: string
          traffic_split?: Json
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_type?: string
          id?: string
          name?: string
          status?: string
          traffic_split?: Json
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      gos_form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          ip_address: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          id?: string
          ip_address?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          ip_address?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gos_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "gos_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      gos_forms: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          experiment_id: string | null
          fields: Json
          id: string
          name: string
          settings: Json
          status: string
          submit_action: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experiment_id?: string | null
          fields?: Json
          id?: string
          name: string
          settings?: Json
          status?: string
          submit_action?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experiment_id?: string | null
          fields?: Json
          id?: string
          name?: string
          settings?: Json
          status?: string
          submit_action?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gos_forms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gos_forms_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "gos_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      gos_health_check_log: {
        Row: {
          checked_at: string
          id: string
          instance_id: string
          message: string | null
          status: string
        }
        Insert: {
          checked_at?: string
          id?: string
          instance_id: string
          message?: string | null
          status?: string
        }
        Update: {
          checked_at?: string
          id?: string
          instance_id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gos_health_check_log_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "gos_integration_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      gos_integration_instances: {
        Row: {
          client_id: string | null
          config: Json
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          integration_id: string
          is_active: boolean
          last_sync_at: string | null
          updated_at: string
          vault_secret_ref: string | null
        }
        Insert: {
          client_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          integration_id: string
          is_active?: boolean
          last_sync_at?: string | null
          updated_at?: string
          vault_secret_ref?: string | null
        }
        Update: {
          client_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string
          is_active?: boolean
          last_sync_at?: string | null
          updated_at?: string
          vault_secret_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gos_integration_instances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gos_integration_instances_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "gos_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      gos_integrations: {
        Row: {
          category: string
          config_schema: Json
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_global: boolean
          name: string
          provider: string
          updated_at: string
        }
        Insert: {
          category?: string
          config_schema?: Json
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_global?: boolean
          name: string
          provider: string
          updated_at?: string
        }
        Update: {
          category?: string
          config_schema?: Json
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_global?: boolean
          name?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      gos_landing_templates: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          experiment_id: string | null
          id: string
          name: string
          sections: Json
          settings: Json
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experiment_id?: string | null
          id?: string
          name: string
          sections?: Json
          settings?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experiment_id?: string | null
          id?: string
          name?: string
          sections?: Json
          settings?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gos_landing_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gos_landing_templates_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "gos_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      gos_onboarding_flows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      gos_onboarding_sessions: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          current_step: number
          data: Json
          flow_id: string | null
          id: string
          started_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          data?: Json
          flow_id?: string | null
          id?: string
          started_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          data?: Json
          flow_id?: string | null
          id?: string
          started_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gos_onboarding_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gos_onboarding_sessions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "gos_onboarding_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      gos_onboarding_tokens: {
        Row: {
          client_label: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          revoked_at: string | null
          session_id: string
          token: string
        }
        Insert: {
          client_label?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          revoked_at?: string | null
          session_id: string
          token?: string
        }
        Update: {
          client_label?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          revoked_at?: string | null
          session_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "gos_onboarding_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gos_onboarding_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      gos_rate_limits: {
        Row: {
          form_id: string
          id: string
          ip_hash: string
          request_count: number
          window_start: string
        }
        Insert: {
          form_id: string
          id?: string
          ip_hash: string
          request_count?: number
          window_start?: string
        }
        Update: {
          form_id?: string
          id?: string
          ip_hash?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      gos_routing_log: {
        Row: {
          action_taken: string | null
          created_at: string
          id: string
          lead_id: string | null
          lead_source: string | null
          matched_conditions: Json | null
          routed_to: string | null
          rule_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          lead_source?: string | null
          matched_conditions?: Json | null
          routed_to?: string | null
          rule_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          lead_source?: string | null
          matched_conditions?: Json | null
          routed_to?: string | null
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gos_routing_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "gos_routing_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      gos_routing_rules: {
        Row: {
          action_config: Json
          action_type: string
          client_id: string | null
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type?: string
          client_id?: string | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          client_id?: string | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gos_routing_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hypothesis_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hypothesis_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "hypothesis_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      hypothesis_threads: {
        Row: {
          ad_account_id: string | null
          client_id: string
          created_at: string
          created_by: string
          id: string
          linked_campaign_ids: string[] | null
          metadata: Json | null
          recommendation_id: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          linked_campaign_ids?: string[] | null
          metadata?: Json | null
          recommendation_id?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          linked_campaign_ids?: string[] | null
          metadata?: Json | null
          recommendation_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hypothesis_threads_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hypothesis_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hypothesis_threads_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_recommendations"
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
      launch_execution_logs: {
        Row: {
          created_at: string
          entity_level: string
          error_detail: string | null
          executed_by: string | null
          external_entity_id: string | null
          id: string
          launch_request_id: string
          message: string | null
          payload_snapshot: Json | null
          response_data: Json | null
          status: string
          step: string
        }
        Insert: {
          created_at?: string
          entity_level?: string
          error_detail?: string | null
          executed_by?: string | null
          external_entity_id?: string | null
          id?: string
          launch_request_id: string
          message?: string | null
          payload_snapshot?: Json | null
          response_data?: Json | null
          status?: string
          step?: string
        }
        Update: {
          created_at?: string
          entity_level?: string
          error_detail?: string | null
          executed_by?: string | null
          external_entity_id?: string | null
          id?: string
          launch_request_id?: string
          message?: string | null
          payload_snapshot?: Json | null
          response_data?: Json | null
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_execution_logs_launch_request_id_fkey"
            columns: ["launch_request_id"]
            isOneToOne: false
            referencedRelation: "launch_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_requests: {
        Row: {
          ad_account_id: string | null
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          draft_id: string
          error_message: string | null
          executed_at: string | null
          executed_by: string | null
          execution_status: string
          external_campaign_id: string | null
          external_ids: Json | null
          id: string
          metadata: Json | null
          normalized_payload: Json | null
          notes: string | null
          platform: string
          priority: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          draft_id: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_status?: string
          external_campaign_id?: string | null
          external_ids?: Json | null
          id?: string
          metadata?: Json | null
          normalized_payload?: Json | null
          notes?: string | null
          platform?: string
          priority?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          draft_id?: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_status?: string
          external_campaign_id?: string | null
          external_ids?: Json | null
          id?: string
          metadata?: Json | null
          normalized_payload?: Json | null
          notes?: string | null
          platform?: string
          priority?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_requests_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_requests_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "campaign_drafts"
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
          bot_profile_id: string | null
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
          bot_profile_id?: string | null
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
          bot_profile_id?: string | null
          channels?: string[]
          created_at?: string
          created_by?: string
          id?: string
          recipients_filter?: string
          sent_at?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_broadcasts_bot_profile_id_fkey"
            columns: ["bot_profile_id"]
            isOneToOne: false
            referencedRelation: "crm_bot_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      optimization_action_logs: {
        Row: {
          action_id: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          payload: Json | null
          status: string
          step: string
        }
        Insert: {
          action_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          payload?: Json | null
          status?: string
          step?: string
        }
        Update: {
          action_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          payload?: Json | null
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimization_action_logs_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "optimization_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_actions: {
        Row: {
          action_type: string
          approved_by: string | null
          client_id: string
          created_at: string
          error_message: string | null
          executed_at: string | null
          executed_by: string | null
          external_ad_id: string | null
          external_adset_id: string | null
          external_campaign_id: string | null
          id: string
          input_payload: Json | null
          launch_request_id: string | null
          normalized_payload: Json | null
          platform: string
          proposed_by: string
          rationale: string
          recommendation_id: string | null
          rejected_by: string | null
          rejection_reason: string | null
          result_payload: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          approved_by?: string | null
          client_id: string
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          external_ad_id?: string | null
          external_adset_id?: string | null
          external_campaign_id?: string | null
          id?: string
          input_payload?: Json | null
          launch_request_id?: string | null
          normalized_payload?: Json | null
          platform?: string
          proposed_by: string
          rationale?: string
          recommendation_id?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          result_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          approved_by?: string | null
          client_id?: string
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          external_ad_id?: string | null
          external_adset_id?: string | null
          external_campaign_id?: string | null
          id?: string
          input_payload?: Json | null
          launch_request_id?: string | null
          normalized_payload?: Json | null
          platform?: string
          proposed_by?: string
          rationale?: string
          recommendation_id?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          result_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimization_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimization_actions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_presets: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          proposed_action_type: string
          proposed_priority: string
          rule_condition: Json
          trigger_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          proposed_action_type?: string
          proposed_priority?: string
          rule_condition?: Json
          trigger_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          proposed_action_type?: string
          proposed_priority?: string
          rule_condition?: Json
          trigger_count?: number
          updated_at?: string
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
      portal_notification_preferences: {
        Row: {
          campaign_launched: boolean
          created_at: string
          file_shared: boolean
          id: string
          optimization_update: boolean
          portal_access_updated: boolean
          portal_user_id: string
          recommendation_added: boolean
          report_available: boolean
          updated_at: string
        }
        Insert: {
          campaign_launched?: boolean
          created_at?: string
          file_shared?: boolean
          id?: string
          optimization_update?: boolean
          portal_access_updated?: boolean
          portal_user_id: string
          recommendation_added?: boolean
          report_available?: boolean
          updated_at?: string
        }
        Update: {
          campaign_launched?: boolean
          created_at?: string
          file_shared?: boolean
          id?: string
          optimization_update?: boolean
          portal_access_updated?: boolean
          portal_user_id?: string
          recommendation_added?: boolean
          report_available?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_notification_preferences_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: true
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_notifications: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          portal_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          portal_user_id?: string | null
          title?: string
          type?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          portal_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_notifications_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
        ]
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
      user_campaign_column_presets: {
        Row: {
          columns: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          columns?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_access_adminscale: boolean
          can_access_afm_internal: boolean
          can_access_ai_ads: boolean
          can_access_crm: boolean
          can_access_growth_os: boolean
          can_add_clients: boolean
          can_assign_clients_to_users: boolean
          can_connect_integrations: boolean
          can_edit_clients: boolean
          can_edit_metrics_override: boolean
          can_manage_ai_infra: boolean
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
          can_access_ai_ads?: boolean
          can_access_crm?: boolean
          can_access_growth_os?: boolean
          can_add_clients?: boolean
          can_assign_clients_to_users?: boolean
          can_connect_integrations?: boolean
          can_edit_clients?: boolean
          can_edit_metrics_override?: boolean
          can_manage_ai_infra?: boolean
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
          can_access_ai_ads?: boolean
          can_access_crm?: boolean
          can_access_growth_os?: boolean
          can_add_clients?: boolean
          can_assign_clients_to_users?: boolean
          can_connect_integrations?: boolean
          can_edit_clients?: boolean
          can_edit_metrics_override?: boolean
          can_manage_ai_infra?: boolean
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
      crm_webhook_endpoints_safe: {
        Row: {
          client_id: string | null
          created_at: string | null
          default_stage_id: string | null
          endpoint_slug: string | null
          field_mapping: Json | null
          has_secret: boolean | null
          id: string | null
          is_active: boolean | null
          name: string | null
          pipeline_id: string | null
          source_label: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          default_stage_id?: string | null
          endpoint_slug?: string | null
          field_mapping?: Json | null
          has_secret?: never
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          pipeline_id?: string | null
          source_label?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          default_stage_id?: string | null
          endpoint_slug?: string | null
          field_mapping?: Json | null
          has_secret?: never
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          pipeline_id?: string | null
          source_label?: string | null
          updated_at?: string | null
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
      accept_portal_invite: {
        Args: { _invite_id: string; _user_id: string }
        Returns: Json
      }
      ai_provider_has_secret: {
        Args: { _provider_id: string }
        Returns: boolean
      }
      delete_ai_provider_secret: {
        Args: { _provider_id: string; _secret_label?: string }
        Returns: undefined
      }
      delete_capi_token: { Args: { _secret_ref: string }; Returns: undefined }
      delete_crm_connection_secret: {
        Args: { _secret_ref: string }
        Returns: undefined
      }
      delete_gos_secret: { Args: { _secret_ref: string }; Returns: undefined }
      delete_social_token: {
        Args: { _token_reference: string }
        Returns: undefined
      }
      get_capi_token: { Args: { _secret_ref: string }; Returns: string }
      get_crm_connection_secret: {
        Args: { _secret_ref: string }
        Returns: string
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
      has_valid_onboarding_token: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      has_valid_onboarding_token_for_flow: {
        Args: { p_flow_id: string }
        Returns: boolean
      }
      is_agency_admin: { Args: { _user_id: string }; Returns: boolean }
      is_agency_member: { Args: { _user_id: string }; Returns: boolean }
      no_admin_exists: { Args: never; Returns: boolean }
      portal_notification_enabled: {
        Args: { _client_id: string; _type: string }
        Returns: boolean
      }
      store_ai_provider_secret: {
        Args: {
          _provider_id: string
          _secret_label?: string
          _secret_value: string
        }
        Returns: string
      }
      store_capi_token: {
        Args: { _secret_name: string; _secret_value: string }
        Returns: string
      }
      store_crm_connection_secret: {
        Args: { _secret_name: string; _secret_value: string }
        Returns: string
      }
      store_gos_secret: {
        Args: { _secret_name: string; _secret_value: string }
        Returns: string
      }
      store_social_token: {
        Args: { _secret_name: string; _secret_value: string }
        Returns: string
      }
      update_portal_last_login: {
        Args: { _user_id: string }
        Returns: undefined
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
      validate_onboarding_token: { Args: { p_token: string }; Returns: Json }
      validate_portal_invite: { Args: { _token: string }; Returns: Json }
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
