
-- Client targets for performance goals
CREATE TABLE public.client_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  target_cpl NUMERIC NULL,
  target_ctr NUMERIC NULL,
  target_leads NUMERIC NULL,
  target_roas NUMERIC NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.client_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can manage targets"
  ON public.client_targets FOR ALL
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Agency members can view targets"
  ON public.client_targets FOR SELECT
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Client users can view own targets"
  ON public.client_targets FOR SELECT
  USING (public.has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_client_targets_updated_at
  BEFORE UPDATE ON public.client_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Report templates
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NULL,
  default_sections JSONB NOT NULL DEFAULT '["kpi_summary","performance_chart","platform_breakdown","daily_table"]'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view templates"
  ON public.report_templates FOR SELECT
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Agency admins can manage templates"
  ON public.report_templates FOR ALL
  USING (public.is_agency_admin(auth.uid()));

CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.report_templates (name, description, default_sections) VALUES
  ('Agency Overview', 'Full agency performance report', '["kpi_summary","performance_chart","platform_breakdown","clients_table","daily_table"]'),
  ('Client Report', 'Individual client performance', '["kpi_summary","performance_chart","platform_breakdown","daily_table","notes"]'),
  ('Executive Summary', 'High-level KPI summary', '["kpi_summary","platform_breakdown"]');

-- Scheduled reports
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'client' CHECK (scope IN ('agency', 'client')),
  client_id UUID NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id UUID NULL REFERENCES public.report_templates(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'monthly')),
  day_of_week INTEGER NULL,
  day_of_month INTEGER NULL,
  send_time TIME NOT NULL DEFAULT '09:00',
  timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE NULL,
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can manage scheduled reports"
  ON public.scheduled_reports FOR ALL
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Agency members can view scheduled reports"
  ON public.scheduled_reports FOR SELECT
  USING (public.is_agency_member(auth.uid()));

CREATE TRIGGER update_scheduled_reports_updated_at
  BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
