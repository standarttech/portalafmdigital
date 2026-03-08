// Local types for AI Ads tables not yet in generated Supabase types

export interface CreativeAsset {
  id: string;
  client_id: string;
  name: string;
  asset_type: 'image' | 'video' | 'external_url' | 'text_only_reference';
  url: string | null;
  file_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: 'active' | 'archived' | 'deleted';
  notes: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OptimizationPreset {
  id: string;
  name: string;
  description: string;
  rule_condition: {
    type: string;
    threshold_hours?: number;
    spend_threshold?: number;
    ctr_threshold?: number;
    min_impressions?: number;
    min_leads?: number;
    cpc_threshold?: number;
    min_clicks?: number;
  };
  proposed_action_type: string;
  proposed_priority: 'high' | 'medium' | 'low';
  is_active: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OptimizationAction {
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

export interface OptimizationActionLog {
  id: string;
  action_id: string;
  step: string;
  status: string;
  message: string;
  payload: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}
