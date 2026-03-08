
-- Phase 4: A/B testing, onboarding tokens, health check log

-- A/B Experiments table
CREATE TABLE public.gos_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT 'landing', -- 'landing' or 'form'
  status TEXT NOT NULL DEFAULT 'draft', -- draft, running, completed
  traffic_split JSONB NOT NULL DEFAULT '{}', -- { "variant_a_id": 50, "variant_b_id": 50 }
  winner_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gos_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_members_manage_experiments" ON public.gos_experiments
  FOR ALL USING (is_agency_member(auth.uid()));

-- Add experiment_id to landing templates and forms
ALTER TABLE public.gos_landing_templates ADD COLUMN IF NOT EXISTS experiment_id UUID REFERENCES public.gos_experiments(id) ON DELETE SET NULL;
ALTER TABLE public.gos_forms ADD COLUMN IF NOT EXISTS experiment_id UUID REFERENCES public.gos_experiments(id) ON DELETE SET NULL;

-- Onboarding access tokens for client-facing portal
CREATE TABLE public.gos_onboarding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.gos_onboarding_sessions(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.gos_onboarding_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_manage_onboarding_tokens" ON public.gos_onboarding_tokens
  FOR ALL USING (is_agency_member(auth.uid()));

-- Allow public read of tokens for validation in edge function
CREATE POLICY "public_read_onboarding_tokens" ON public.gos_onboarding_tokens
  FOR SELECT USING (true);

-- Health check log
CREATE TABLE public.gos_health_check_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.gos_integration_instances(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unknown',
  message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gos_health_check_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_read_health_logs" ON public.gos_health_check_log
  FOR SELECT USING (is_agency_member(auth.uid()));

CREATE POLICY "service_insert_health_logs" ON public.gos_health_check_log
  FOR INSERT WITH CHECK (true);

-- Add variant tracking to analytics events
ALTER TABLE public.gos_analytics_events ADD COLUMN IF NOT EXISTS variant_id UUID;

-- Trigger for updated_at on experiments
CREATE TRIGGER update_gos_experiments_updated_at
  BEFORE UPDATE ON public.gos_experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
