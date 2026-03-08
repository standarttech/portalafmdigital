
-- Growth OS: Landing Page Templates
CREATE TABLE public.gos_landing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gos_landing_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage landing templates" ON public.gos_landing_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Growth OS: Form Builder
CREATE TABLE public.gos_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  submit_action TEXT NOT NULL DEFAULT 'store',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gos_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage forms" ON public.gos_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.gos_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.gos_forms(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gos_form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view submissions" ON public.gos_form_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Growth OS: Client Onboarding Wizard
CREATE TABLE public.gos_onboarding_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gos_onboarding_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage onboarding flows" ON public.gos_onboarding_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.gos_onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID REFERENCES public.gos_onboarding_flows(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  current_step INT NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gos_onboarding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage onboarding sessions" ON public.gos_onboarding_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Growth OS: Integrations Hub
CREATE TABLE public.gos_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  config_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gos_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view integrations" ON public.gos_integrations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.gos_integration_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES public.gos_integrations(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gos_integration_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage integration instances" ON public.gos_integration_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Growth OS: Lead Routing Center
CREATE TABLE public.gos_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  priority INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_type TEXT NOT NULL DEFAULT 'assign_user',
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gos_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage routing rules" ON public.gos_routing_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.gos_routing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.gos_routing_rules(id) ON DELETE SET NULL,
  lead_id UUID,
  lead_source TEXT,
  matched_conditions JSONB,
  action_taken TEXT,
  routed_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gos_routing_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view routing log" ON public.gos_routing_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add permission column for Growth OS access
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS can_access_growth_os BOOLEAN NOT NULL DEFAULT false;
