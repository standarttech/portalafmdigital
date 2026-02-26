
-- CRM Pipelines
CREATE TABLE public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access crm_pipelines" ON public.crm_pipelines FOR ALL USING (is_agency_admin(auth.uid()));
CREATE POLICY "Agency members view crm_pipelines" ON public.crm_pipelines FOR SELECT USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Agency members insert crm_pipelines" ON public.crm_pipelines FOR INSERT WITH CHECK (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));
CREATE POLICY "Agency members update crm_pipelines" ON public.crm_pipelines FOR UPDATE USING (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));

-- CRM Pipeline Stages
CREATE TABLE public.crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1',
  is_closed_stage boolean NOT NULL DEFAULT false,
  is_won_stage boolean NOT NULL DEFAULT false,
  is_lost_stage boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access crm_pipeline_stages" ON public.crm_pipeline_stages FOR ALL USING (is_agency_admin(auth.uid()));
CREATE POLICY "Agency members view crm_pipeline_stages" ON public.crm_pipeline_stages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.crm_pipelines p WHERE p.id = crm_pipeline_stages.pipeline_id AND has_client_access(auth.uid(), p.client_id))
);
CREATE POLICY "Agency members insert crm_pipeline_stages" ON public.crm_pipeline_stages FOR INSERT WITH CHECK (
  is_agency_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.crm_pipelines p WHERE p.id = crm_pipeline_stages.pipeline_id AND has_client_access(auth.uid(), p.client_id))
);
CREATE POLICY "Agency members update crm_pipeline_stages" ON public.crm_pipeline_stages FOR UPDATE USING (
  is_agency_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.crm_pipelines p WHERE p.id = crm_pipeline_stages.pipeline_id AND has_client_access(auth.uid(), p.client_id))
);
CREATE POLICY "Agency members delete crm_pipeline_stages" ON public.crm_pipeline_stages FOR DELETE USING (
  is_agency_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.crm_pipelines p WHERE p.id = crm_pipeline_stages.pipeline_id AND has_client_access(auth.uid(), p.client_id))
);

-- CRM Leads
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.crm_pipeline_stages(id) ON DELETE RESTRICT,
  assignee_id uuid,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  value numeric NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  notes_summary text NOT NULL DEFAULT '',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  campaign_name text,
  adset_name text,
  ad_name text,
  form_name text,
  landing_page text,
  external_lead_id text,
  raw_payload jsonb,
  is_duplicate boolean NOT NULL DEFAULT false,
  duplicate_of uuid REFERENCES public.crm_leads(id),
  won_at timestamptz,
  lost_at timestamptz,
  won_reason text,
  lost_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access crm_leads" ON public.crm_leads FOR ALL USING (is_agency_admin(auth.uid()));
CREATE POLICY "Agency members view crm_leads" ON public.crm_leads FOR SELECT USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Agency members insert crm_leads" ON public.crm_leads FOR INSERT WITH CHECK (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));
CREATE POLICY "Agency members update crm_leads" ON public.crm_leads FOR UPDATE USING (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));
CREATE POLICY "Agency members delete crm_leads" ON public.crm_leads FOR DELETE USING (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));

-- CRM Lead Notes
CREATE TABLE public.crm_lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access crm_lead_notes" ON public.crm_lead_notes FOR ALL USING (is_agency_admin(auth.uid()));
CREATE POLICY "Agency members view crm_lead_notes" ON public.crm_lead_notes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = crm_lead_notes.lead_id AND has_client_access(auth.uid(), l.client_id))
);
CREATE POLICY "Agency members insert crm_lead_notes" ON public.crm_lead_notes FOR INSERT WITH CHECK (
  is_agency_member(auth.uid()) AND author_id = auth.uid()
);
CREATE POLICY "Agency members delete own crm_lead_notes" ON public.crm_lead_notes FOR DELETE USING (author_id = auth.uid());

-- CRM Lead Activities
CREATE TABLE public.crm_lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  user_id uuid,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access crm_lead_activities" ON public.crm_lead_activities FOR ALL USING (is_agency_admin(auth.uid()));
CREATE POLICY "Agency members view crm_lead_activities" ON public.crm_lead_activities FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = crm_lead_activities.lead_id AND has_client_access(auth.uid(), l.client_id))
);
CREATE POLICY "Agency members insert crm_lead_activities" ON public.crm_lead_activities FOR INSERT WITH CHECK (is_agency_member(auth.uid()));

-- CRM Webhook Endpoints
CREATE TABLE public.crm_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Webhook',
  secret_key text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  endpoint_slug text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  default_stage_id uuid REFERENCES public.crm_pipeline_stages(id),
  source_label text NOT NULL DEFAULT 'webhook',
  is_active boolean NOT NULL DEFAULT true,
  field_mapping jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(endpoint_slug)
);
ALTER TABLE public.crm_webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access crm_webhook_endpoints" ON public.crm_webhook_endpoints FOR ALL USING (is_agency_admin(auth.uid()));
CREATE POLICY "Agency members view crm_webhook_endpoints" ON public.crm_webhook_endpoints FOR SELECT USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Agency members insert crm_webhook_endpoints" ON public.crm_webhook_endpoints FOR INSERT WITH CHECK (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));
CREATE POLICY "Agency members update crm_webhook_endpoints" ON public.crm_webhook_endpoints FOR UPDATE USING (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));

-- CRM Webhook Logs
CREATE TABLE public.crm_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.crm_webhook_endpoints(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'success',
  request_payload jsonb,
  response_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access crm_webhook_logs" ON public.crm_webhook_logs FOR ALL USING (is_agency_admin(auth.uid()));
CREATE POLICY "Agency members view crm_webhook_logs" ON public.crm_webhook_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.crm_webhook_endpoints e WHERE e.id = crm_webhook_logs.endpoint_id AND has_client_access(auth.uid(), e.client_id))
);

-- CRM Custom Fields
CREATE TABLE public.crm_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  key text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  is_required boolean NOT NULL DEFAULT false,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access crm_custom_fields" ON public.crm_custom_fields FOR ALL USING (is_agency_admin(auth.uid()));
CREATE POLICY "Agency members view crm_custom_fields" ON public.crm_custom_fields FOR SELECT USING (has_client_access(auth.uid(), client_id));

-- CRM Lead Custom Field Values
CREATE TABLE public.crm_lead_custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  custom_field_id uuid NOT NULL REFERENCES public.crm_custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id, custom_field_id)
);
ALTER TABLE public.crm_lead_custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access crm_lead_custom_field_values" ON public.crm_lead_custom_field_values FOR ALL USING (is_agency_admin(auth.uid()));
CREATE POLICY "Agency members view crm_lead_custom_field_values" ON public.crm_lead_custom_field_values FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = crm_lead_custom_field_values.lead_id AND has_client_access(auth.uid(), l.client_id))
);
CREATE POLICY "Agency members manage crm_lead_custom_field_values" ON public.crm_lead_custom_field_values FOR INSERT WITH CHECK (
  is_agency_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = crm_lead_custom_field_values.lead_id AND has_client_access(auth.uid(), l.client_id))
);
CREATE POLICY "Agency members update crm_lead_custom_field_values" ON public.crm_lead_custom_field_values FOR UPDATE USING (
  is_agency_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = crm_lead_custom_field_values.lead_id AND has_client_access(auth.uid(), l.client_id))
);

-- Indexes for performance
CREATE INDEX idx_crm_leads_client_id ON public.crm_leads(client_id);
CREATE INDEX idx_crm_leads_pipeline_id ON public.crm_leads(pipeline_id);
CREATE INDEX idx_crm_leads_stage_id ON public.crm_leads(stage_id);
CREATE INDEX idx_crm_leads_email ON public.crm_leads(email);
CREATE INDEX idx_crm_leads_phone ON public.crm_leads(phone);
CREATE INDEX idx_crm_leads_external_lead_id ON public.crm_leads(external_lead_id);
CREATE INDEX idx_crm_pipelines_client_id ON public.crm_pipelines(client_id);
CREATE INDEX idx_crm_pipeline_stages_pipeline_id ON public.crm_pipeline_stages(pipeline_id);
CREATE INDEX idx_crm_lead_activities_lead_id ON public.crm_lead_activities(lead_id);
CREATE INDEX idx_crm_lead_notes_lead_id ON public.crm_lead_notes(lead_id);
CREATE INDEX idx_crm_webhook_endpoints_slug ON public.crm_webhook_endpoints(endpoint_slug);
CREATE INDEX idx_crm_webhook_logs_endpoint_id ON public.crm_webhook_logs(endpoint_id);
