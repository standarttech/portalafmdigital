
-- Campaign performance snapshots - normalized metrics storage
CREATE TABLE public.campaign_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  launch_request_id uuid NULL,
  platform text NOT NULL DEFAULT 'meta',
  entity_level text NOT NULL DEFAULT 'campaign',
  external_campaign_id text NULL,
  external_adset_id text NULL,
  external_ad_id text NULL,
  entity_name text NULL,
  entity_status text NULL,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  cpc numeric NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  date_window_start date NULL,
  date_window_end date NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_cps_client_id ON public.campaign_performance_snapshots(client_id);
CREATE INDEX idx_cps_launch_request ON public.campaign_performance_snapshots(launch_request_id);
CREATE INDEX idx_cps_external_campaign ON public.campaign_performance_snapshots(external_campaign_id);
CREATE INDEX idx_cps_synced_at ON public.campaign_performance_snapshots(synced_at DESC);
CREATE INDEX idx_cps_entity_level ON public.campaign_performance_snapshots(entity_level);

-- RLS
ALTER TABLE public.campaign_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can manage all snapshots"
  ON public.campaign_performance_snapshots FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()))
  WITH CHECK (public.is_agency_admin(auth.uid()));

CREATE POLICY "Users with client access can read snapshots"
  ON public.campaign_performance_snapshots FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));
