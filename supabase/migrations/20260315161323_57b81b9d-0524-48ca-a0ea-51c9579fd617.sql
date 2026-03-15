
-- Facebook Lead Gen Events table for proper ingestion storage
CREATE TABLE public.fb_leadgen_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leadgen_id text NOT NULL,
  page_id text,
  form_id text,
  ad_id text,
  created_time timestamptz,
  raw_payload jsonb,
  normalized_payload jsonb,
  lead_data jsonb,
  status text NOT NULL DEFAULT 'received',
  matched_automation_id uuid REFERENCES public.automations(id) ON DELETE SET NULL,
  execution_run_id uuid,
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique index for deduplication
CREATE UNIQUE INDEX idx_fb_leadgen_events_leadgen_id ON public.fb_leadgen_events (leadgen_id);

-- Index for matching
CREATE INDEX idx_fb_leadgen_events_page_form ON public.fb_leadgen_events (page_id, form_id);
CREATE INDEX idx_fb_leadgen_events_status ON public.fb_leadgen_events (status);

-- RLS: only agency members can read
ALTER TABLE public.fb_leadgen_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can read fb_leadgen_events"
  ON public.fb_leadgen_events FOR SELECT
  TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Service role can insert fb_leadgen_events"
  ON public.fb_leadgen_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can update fb_leadgen_events"
  ON public.fb_leadgen_events FOR UPDATE
  TO authenticated
  USING (public.is_agency_member(auth.uid()));
