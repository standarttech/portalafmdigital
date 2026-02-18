
-- Add new client statuses
-- We need to update the client_status enum to add new values
ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'stop';

-- Create client_status_history table
CREATE TABLE IF NOT EXISTS public.client_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE public.client_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage status history"
  ON public.client_status_history FOR ALL
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Agency members view status history"
  ON public.client_status_history FOR SELECT
  USING (is_agency_member(auth.uid()));

-- Create project_events table for project history (tab 9)
CREATE TABLE IF NOT EXISTS public.project_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'note', -- note, status_change, task, comment, connection
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage project events"
  ON public.project_events FOR ALL
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Agency members view project events"
  ON public.project_events FOR SELECT
  USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency members insert project events"
  ON public.project_events FOR INSERT
  WITH CHECK (is_agency_member(auth.uid()));

-- Create logo_settings table for admin logo management (pункт 3)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage platform settings"
  ON public.platform_settings FOR ALL
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "All authenticated users can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add logo_url column to platform settings with initial data
INSERT INTO public.platform_settings (key, value) VALUES 
  ('logo', '{"url": null, "size": 36, "bg_color": null, "border_radius": 8}')
  ON CONFLICT (key) DO NOTHING;
