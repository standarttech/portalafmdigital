
-- =============================================
-- AI Infrastructure Module: Schema Foundation
-- =============================================

-- 1. ai_providers
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  provider_type text NOT NULL DEFAULT 'external_api',
  category text NOT NULL DEFAULT 'general',
  base_url text,
  auth_type text NOT NULL DEFAULT 'none',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  supports_text boolean NOT NULL DEFAULT false,
  supports_chat boolean NOT NULL DEFAULT false,
  supports_structured_output boolean NOT NULL DEFAULT false,
  supports_images boolean NOT NULL DEFAULT false,
  supports_workflows boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. ai_provider_secrets
CREATE TABLE public.ai_provider_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  secret_ref uuid,
  secret_label text NOT NULL DEFAULT 'API Key',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. ai_provider_routes
CREATE TABLE public.ai_provider_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  primary_provider_id uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  fallback_provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  timeout_seconds integer NOT NULL DEFAULT 60,
  retry_limit integer NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_type)
);

-- 4. ai_tasks
CREATE TABLE public.ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL,
  source_module text NOT NULL DEFAULT 'unknown',
  source_entity_type text,
  source_entity_id text,
  input_payload jsonb DEFAULT '{}',
  normalized_input jsonb DEFAULT '{}',
  selected_provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  provider_route_id uuid REFERENCES public.ai_provider_routes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  attempt_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error_message text,
  output_payload jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. ai_task_logs
CREATE TABLE public.ai_task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
  step_type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. ai_provider_health_checks
CREATE TABLE public.ai_provider_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'unknown',
  checked_at timestamptz NOT NULL DEFAULT now(),
  latency_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}'
);

-- 7. ai_task_templates
CREATE TABLE public.ai_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  task_type text NOT NULL,
  description text,
  input_template jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Permission flag
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS can_manage_ai_infra boolean NOT NULL DEFAULT false;

-- Updated_at triggers
CREATE TRIGGER set_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_ai_provider_routes_updated_at BEFORE UPDATE ON public.ai_provider_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_ai_tasks_updated_at BEFORE UPDATE ON public.ai_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_ai_task_templates_updated_at BEFORE UPDATE ON public.ai_task_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS Policies: Admin-only management
-- =============================================

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_templates ENABLE ROW LEVEL SECURITY;

-- ai_providers: agency members can read, admins can manage
CREATE POLICY "Members can view providers" ON public.ai_providers FOR SELECT TO authenticated USING (is_agency_member(auth.uid()));
CREATE POLICY "Admins can manage providers" ON public.ai_providers FOR ALL TO authenticated USING (is_agency_admin(auth.uid())) WITH CHECK (is_agency_admin(auth.uid()));

-- ai_provider_secrets: admin-only
CREATE POLICY "Admins can manage provider secrets" ON public.ai_provider_secrets FOR ALL TO authenticated USING (is_agency_admin(auth.uid())) WITH CHECK (is_agency_admin(auth.uid()));

-- ai_provider_routes: members can read, admins manage
CREATE POLICY "Members can view routes" ON public.ai_provider_routes FOR SELECT TO authenticated USING (is_agency_member(auth.uid()));
CREATE POLICY "Admins can manage routes" ON public.ai_provider_routes FOR ALL TO authenticated USING (is_agency_admin(auth.uid())) WITH CHECK (is_agency_admin(auth.uid()));

-- ai_tasks: members can view own client-scoped or their own tasks, admins all
CREATE POLICY "Members can view tasks" ON public.ai_tasks FOR SELECT TO authenticated USING (
  is_agency_admin(auth.uid()) OR requested_by = auth.uid() OR (client_id IS NOT NULL AND has_client_access(auth.uid(), client_id))
);
CREATE POLICY "Members can create tasks" ON public.ai_tasks FOR INSERT TO authenticated WITH CHECK (
  is_agency_member(auth.uid()) AND requested_by = auth.uid()
);
CREATE POLICY "Admins can manage tasks" ON public.ai_tasks FOR ALL TO authenticated USING (is_agency_admin(auth.uid())) WITH CHECK (is_agency_admin(auth.uid()));

-- ai_task_logs: read access for members on their tasks
CREATE POLICY "Members can view task logs" ON public.ai_task_logs FOR SELECT TO authenticated USING (
  is_agency_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.ai_tasks t WHERE t.id = task_id AND (t.requested_by = auth.uid() OR (t.client_id IS NOT NULL AND has_client_access(auth.uid(), t.client_id)))
  )
);
CREATE POLICY "Admins can manage task logs" ON public.ai_task_logs FOR ALL TO authenticated USING (is_agency_admin(auth.uid())) WITH CHECK (is_agency_admin(auth.uid()));

-- ai_provider_health_checks: members can read, admins manage
CREATE POLICY "Members can view health checks" ON public.ai_provider_health_checks FOR SELECT TO authenticated USING (is_agency_member(auth.uid()));
CREATE POLICY "Admins can manage health checks" ON public.ai_provider_health_checks FOR ALL TO authenticated USING (is_agency_admin(auth.uid())) WITH CHECK (is_agency_admin(auth.uid()));

-- ai_task_templates: members can read, admins manage
CREATE POLICY "Members can view templates" ON public.ai_task_templates FOR SELECT TO authenticated USING (is_agency_member(auth.uid()));
CREATE POLICY "Admins can manage templates" ON public.ai_task_templates FOR ALL TO authenticated USING (is_agency_admin(auth.uid())) WITH CHECK (is_agency_admin(auth.uid()));

-- Seed the built-in Lovable AI provider
INSERT INTO public.ai_providers (name, slug, provider_type, category, base_url, auth_type, is_active, is_default, supports_text, supports_chat, supports_structured_output, supports_images, supports_workflows, metadata, created_by)
VALUES (
  'Lovable AI Gateway', 'lovable-ai', 'external_api', 'reasoning',
  'https://ai.gateway.lovable.dev/v1', 'bearer', true, true,
  true, true, true, false, false,
  '{"model": "google/gemini-3-flash-preview", "builtin": true}'::jsonb,
  '00000000-0000-0000-0000-000000000000'
);

-- Seed default routes for AI Ads task types
INSERT INTO public.ai_provider_routes (task_type, primary_provider_id, timeout_seconds, retry_limit)
SELECT task_type, p.id, 90, 1
FROM (VALUES
  ('ai_ads_analysis'),
  ('ai_ads_hypothesis'),
  ('ai_ads_recommendation'),
  ('ai_ads_draft_generation'),
  ('creative_prompt_generation'),
  ('image_generation_request'),
  ('generic_summary')
) AS t(task_type)
CROSS JOIN public.ai_providers p WHERE p.slug = 'lovable-ai';
