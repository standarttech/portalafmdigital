-- Expand launch_requests with execution fields
ALTER TABLE public.launch_requests
  ADD COLUMN IF NOT EXISTS ad_account_id uuid REFERENCES public.ad_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'meta',
  ADD COLUMN IF NOT EXISTS execution_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS normalized_payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS external_campaign_id text,
  ADD COLUMN IF NOT EXISTS external_ids jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS executed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS executed_by uuid;

-- Expand launch_execution_logs with entity-level detail
ALTER TABLE public.launch_execution_logs
  ADD COLUMN IF NOT EXISTS entity_level text NOT NULL DEFAULT 'campaign',
  ADD COLUMN IF NOT EXISTS external_entity_id text,
  ADD COLUMN IF NOT EXISTS payload_snapshot jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS error_detail text;

-- Update draft status enum support - add new statuses via comments
COMMENT ON TABLE public.campaign_drafts IS 'Statuses: draft, ready_for_review, rejected, approved, submitted_for_execution, executed, execution_failed';
COMMENT ON TABLE public.launch_requests IS 'Status: pending_approval, approved, rejected, executing, completed, failed. Execution status: not_started, preflight_passed, execution_started, execution_partial, execution_completed, execution_failed, execution_blocked';