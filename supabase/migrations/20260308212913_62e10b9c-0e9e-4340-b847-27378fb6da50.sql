-- Creative assets table
CREATE TABLE public.creative_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  asset_type text NOT NULL DEFAULT 'image', -- image, video, external_url, text_only_reference
  url text,
  file_path text,
  mime_type text,
  file_size_bytes bigint,
  status text NOT NULL DEFAULT 'active', -- active, archived, deleted
  notes text DEFAULT '',
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with client access can read creative assets"
ON public.creative_assets FOR SELECT TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users with client access can create creative assets"
ON public.creative_assets FOR INSERT TO authenticated
WITH CHECK (has_client_access(auth.uid(), client_id) AND created_by = auth.uid());

CREATE POLICY "Agency admins can manage all creative assets"
ON public.creative_assets FOR ALL TO authenticated
USING (is_agency_admin(auth.uid()))
WITH CHECK (is_agency_admin(auth.uid()));

CREATE INDEX idx_creative_assets_client ON public.creative_assets(client_id);

-- Optimization presets table
CREATE TABLE public.optimization_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  rule_condition jsonb NOT NULL DEFAULT '{}',
  proposed_action_type text NOT NULL DEFAULT 'mark_for_review',
  proposed_priority text NOT NULL DEFAULT 'medium',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.optimization_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can manage optimization presets"
ON public.optimization_presets FOR ALL TO authenticated
USING (is_agency_admin(auth.uid()))
WITH CHECK (is_agency_admin(auth.uid()));

CREATE POLICY "Authenticated users can read active presets"
ON public.optimization_presets FOR SELECT TO authenticated
USING (is_active = true);

-- Creative asset binding for draft items
ALTER TABLE public.campaign_draft_items ADD COLUMN IF NOT EXISTS creative_asset_id uuid REFERENCES public.creative_assets(id) ON DELETE SET NULL;

-- Seed default optimization presets
INSERT INTO public.optimization_presets (name, description, rule_condition, proposed_action_type, proposed_priority, created_by) VALUES
('No delivery after 24h', 'If campaign has 0 impressions after 24 hours since launch, propose investigation and potential relaunch', '{"type":"no_delivery","threshold_hours":24}', 'relaunch_with_changes', 'high', '00000000-0000-0000-0000-000000000000'),
('Spend without results', 'If spend exceeds $50 with zero conversions (leads or purchases), propose pausing', '{"type":"spend_no_results","spend_threshold":50}', 'pause_campaign', 'high', '00000000-0000-0000-0000-000000000000'),
('Low CTR warning', 'If CTR below 0.5% with 500+ impressions, propose creative review', '{"type":"low_ctr","ctr_threshold":0.5,"min_impressions":500}', 'mark_for_review', 'medium', '00000000-0000-0000-0000-000000000000'),
('Scale winning campaign', 'If CTR above 1.5% and 3+ leads with active spend, propose budget increase', '{"type":"winner_detected","ctr_threshold":1.5,"min_leads":3}', 'increase_budget', 'medium', '00000000-0000-0000-0000-000000000000'),
('Platform rejection detected', 'If Meta reports DISAPPROVED or WITH_ISSUES status, propose investigation', '{"type":"platform_rejection"}', 'mark_for_review', 'high', '00000000-0000-0000-0000-000000000000'),
('Partial execution recovery', 'If execution was partial with missing entities, propose relaunch with fixes', '{"type":"partial_execution"}', 'relaunch_with_changes', 'high', '00000000-0000-0000-0000-000000000000'),
('Duplicate winner', 'If campaign has strong results (CTR > 2%, 5+ leads), propose duplicating into new test', '{"type":"strong_winner","ctr_threshold":2.0,"min_leads":5}', 'duplicate_winner', 'medium', '00000000-0000-0000-0000-000000000000'),
('High CPC alert', 'If CPC exceeds $10 with 5+ clicks, propose review and potential pause', '{"type":"high_cpc","cpc_threshold":10,"min_clicks":5}', 'mark_for_review', 'medium', '00000000-0000-0000-0000-000000000000');