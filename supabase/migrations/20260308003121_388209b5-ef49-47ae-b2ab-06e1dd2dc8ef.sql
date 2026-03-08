
-- Table for ad-level metrics (adsets and ads)
CREATE TABLE public.ad_level_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ad_account_id uuid REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'ad', -- 'adset' or 'ad'
  platform_id text NOT NULL, -- platform adset_id or ad_id
  name text NOT NULL DEFAULT '',
  parent_platform_id text, -- for ads: the adset platform id
  date date NOT NULL,
  spend numeric NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  link_clicks integer NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  add_to_cart integer NOT NULL DEFAULT 0,
  checkouts integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, level, platform_id, date)
);

ALTER TABLE public.ad_level_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access ad_level_metrics"
  ON public.ad_level_metrics FOR ALL
  TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users view ad_level_metrics"
  ON public.ad_level_metrics FOR SELECT
  TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));
