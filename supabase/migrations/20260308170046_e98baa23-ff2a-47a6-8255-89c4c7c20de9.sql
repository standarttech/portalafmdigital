
-- Analytics events table for landing/form tracking
CREATE TABLE public.gos_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gos_analytics_events_entity ON public.gos_analytics_events(entity_type, entity_id);
CREATE INDEX idx_gos_analytics_events_created ON public.gos_analytics_events(created_at);
CREATE INDEX idx_gos_analytics_events_type ON public.gos_analytics_events(event_type);

ALTER TABLE public.gos_analytics_events ENABLE ROW LEVEL SECURITY;

-- Public insert for embed views/submissions (no auth required)
CREATE POLICY "anon_insert_analytics" ON public.gos_analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Authenticated read scoped by client access
CREATE POLICY "auth_select_analytics" ON public.gos_analytics_events
  FOR SELECT TO authenticated
  USING (
    public.is_agency_admin(auth.uid())
    OR public.has_client_access(auth.uid(), client_id)
  );

-- Storage bucket for onboarding files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('gos-onboarding-files', 'gos-onboarding-files', false, 10485760);

-- Storage RLS: authenticated users can upload to their client paths
CREATE POLICY "auth_upload_onboarding_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gos-onboarding-files');

CREATE POLICY "auth_read_onboarding_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'gos-onboarding-files');

CREATE POLICY "auth_update_onboarding_files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'gos-onboarding-files');

CREATE POLICY "auth_delete_onboarding_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gos-onboarding-files');

-- Rate limiting table for public form submissions
CREATE TABLE public.gos_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  form_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INT NOT NULL DEFAULT 1
);

CREATE INDEX idx_gos_rate_limits_lookup ON public.gos_rate_limits(ip_hash, form_id, window_start);

ALTER TABLE public.gos_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (edge function uses service role)
-- No public policies needed
