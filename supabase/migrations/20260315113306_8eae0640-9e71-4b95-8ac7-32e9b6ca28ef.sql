
-- Automations
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  is_global boolean DEFAULT false,
  is_active boolean DEFAULT false,
  folder text DEFAULT '',
  created_by text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}',
  last_run_at timestamptz,
  last_run_status text,
  run_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Automation steps
CREATE TABLE public.automation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
  step_order int NOT NULL DEFAULT 0,
  step_type text NOT NULL DEFAULT 'action',
  action_type text,
  config jsonb DEFAULT '{}',
  field_mapping jsonb DEFAULT '{}',
  condition_config jsonb,
  name text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Execution runs
CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending',
  trigger_payload jsonb DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms int,
  error_message text,
  steps_total int DEFAULT 0,
  steps_completed int DEFAULT 0,
  steps_failed int DEFAULT 0,
  is_test boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Per-step execution logs
CREATE TABLE public.automation_run_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.automation_runs(id) ON DELETE CASCADE NOT NULL,
  step_id uuid,
  step_order int NOT NULL DEFAULT 0,
  step_name text DEFAULT '',
  action_type text DEFAULT '',
  status text DEFAULT 'pending',
  input_payload jsonb DEFAULT '{}',
  output_payload jsonb DEFAULT '{}',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

-- Templates
CREATE TABLE public.automation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'general',
  icon text DEFAULT 'Zap',
  trigger_type text NOT NULL,
  steps_config jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;

-- Automations policies
CREATE POLICY "automations_select" ON public.automations FOR SELECT TO authenticated USING (
  is_agency_member(auth.uid()) AND (is_global OR client_id IS NULL OR has_client_access(auth.uid(), client_id))
);
CREATE POLICY "automations_insert" ON public.automations FOR INSERT TO authenticated WITH CHECK (
  is_agency_member(auth.uid()) AND (client_id IS NULL OR has_client_access(auth.uid(), client_id))
);
CREATE POLICY "automations_update" ON public.automations FOR UPDATE TO authenticated USING (
  is_agency_member(auth.uid()) AND (client_id IS NULL OR has_client_access(auth.uid(), client_id))
);
CREATE POLICY "automations_delete" ON public.automations FOR DELETE TO authenticated USING (
  is_agency_admin(auth.uid())
);

-- Steps follow automation access
CREATE POLICY "steps_all" ON public.automation_steps FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.automations a WHERE a.id = automation_id AND is_agency_member(auth.uid()) AND (a.client_id IS NULL OR has_client_access(auth.uid(), a.client_id)))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.automations a WHERE a.id = automation_id AND is_agency_member(auth.uid()) AND (a.client_id IS NULL OR has_client_access(auth.uid(), a.client_id)))
);

-- Runs follow automation access
CREATE POLICY "runs_all" ON public.automation_runs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.automations a WHERE a.id = automation_id AND is_agency_member(auth.uid()) AND (a.client_id IS NULL OR has_client_access(auth.uid(), a.client_id)))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.automations a WHERE a.id = automation_id AND is_agency_member(auth.uid()) AND (a.client_id IS NULL OR has_client_access(auth.uid(), a.client_id)))
);

-- Run steps follow run->automation access
CREATE POLICY "run_steps_all" ON public.automation_run_steps FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.automation_runs r
    JOIN public.automations a ON a.id = r.automation_id
    WHERE r.id = run_id AND is_agency_member(auth.uid()) AND (a.client_id IS NULL OR has_client_access(auth.uid(), a.client_id))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.automation_runs r
    JOIN public.automations a ON a.id = r.automation_id
    WHERE r.id = run_id AND is_agency_member(auth.uid()) AND (a.client_id IS NULL OR has_client_access(auth.uid(), a.client_id))
  )
);

-- Templates: readable by all authenticated, managed by admins
CREATE POLICY "templates_select" ON public.automation_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_manage" ON public.automation_templates FOR INSERT TO authenticated WITH CHECK (is_agency_admin(auth.uid()));
CREATE POLICY "templates_update_pol" ON public.automation_templates FOR UPDATE TO authenticated USING (is_agency_admin(auth.uid()));
CREATE POLICY "templates_delete_pol" ON public.automation_templates FOR DELETE TO authenticated USING (is_agency_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_automations_ts BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_steps_ts BEFORE UPDATE ON public.automation_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
