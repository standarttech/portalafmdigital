/**
 * Supplementary type definitions for tables that exist in the database
 * but are not yet present in the auto-generated types.ts.
 *
 * These types are derived from the actual database schema (information_schema.columns)
 * and should be used with `supabase.from('table_name' as any)` until types.ts is regenerated.
 *
 * Last synced: 2026-03-09
 */

// ── launch_requests ──

export interface LaunchRequestRow {
  id: string;
  draft_id: string;
  client_id: string;
  requested_by: string;
  status: string;
  priority: string;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  ad_account_id: string | null;
  platform: string;
  execution_status: string;
  normalized_payload: Record<string, unknown> | null;
  error_message: string | null;
  external_campaign_id: string | null;
  external_ids: Record<string, unknown> | null;
  executed_at: string | null;
  executed_by: string | null;
}

// ── launch_execution_logs ──

export interface LaunchExecutionLogRow {
  id: string;
  launch_request_id: string;
  step: string;
  status: string;
  message: string | null;
  response_data: Record<string, unknown> | null;
  executed_by: string | null;
  created_at: string;
  entity_level: string;
  external_entity_id: string | null;
  payload_snapshot: Record<string, unknown> | null;
  error_detail: string | null;
}

// ── hypothesis_threads ──

export interface HypothesisThreadRow {
  id: string;
  client_id: string;
  ad_account_id: string | null;
  title: string;
  status: string;
  tags: string[] | null;
  linked_campaign_ids: string[] | null;
  created_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  recommendation_id: string | null;
}

// ── hypothesis_messages ──

export interface HypothesisMessageRow {
  id: string;
  thread_id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

// ── creative_assets ──

export interface CreativeAssetRow {
  id: string;
  client_id: string;
  name: string;
  asset_type: string;
  url: string | null;
  file_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: string;
  notes: string | null;
  tags: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ── optimization_actions ──

export interface OptimizationActionRow {
  id: string;
  client_id: string;
  launch_request_id: string | null;
  recommendation_id: string | null;
  external_campaign_id: string | null;
  external_adset_id: string | null;
  external_ad_id: string | null;
  action_type: string;
  platform: string;
  proposed_by: string;
  approved_by: string | null;
  rejected_by: string | null;
  executed_by: string | null;
  status: string;
  rationale: string;
  input_payload: Record<string, unknown> | null;
  normalized_payload: Record<string, unknown> | null;
  result_payload: Record<string, unknown> | null;
  error_message: string | null;
  rejection_reason: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── optimization_action_logs ──

export interface OptimizationActionLogRow {
  id: string;
  action_id: string;
  step: string;
  status: string;
  message: string;
  payload: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

// ── optimization_presets ──

export interface OptimizationPresetRow {
  id: string;
  name: string;
  description: string;
  rule_condition: Record<string, unknown>;
  proposed_action_type: string;
  proposed_priority: string;
  is_active: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ── portal_notifications ──

export interface PortalNotificationRow {
  id: string;
  client_id: string;
  portal_user_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ── portal_notification_preferences ──

export interface PortalNotificationPreferenceRow {
  id: string;
  portal_user_id: string;
  campaign_launched: boolean;
  optimization_update: boolean;
  recommendation_added: boolean;
  report_available: boolean;
  file_shared: boolean;
  portal_access_updated: boolean;
  created_at: string;
  updated_at: string;
}
