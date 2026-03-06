CREATE TABLE IF NOT EXISTS public.client_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  brief_url text DEFAULT '',
  monthly_budget numeric DEFAULT 0,
  website_url text DEFAULT '',
  instagram_url text DEFAULT '',
  facebook_url text DEFAULT '',
  tiktok_url text DEFAULT '',
  linkedin_url text DEFAULT '',
  youtube_url text DEFAULT '',
  twitter_url text DEFAULT '',
  telegram_url text DEFAULT '',
  business_niche text DEFAULT '',
  target_audience text DEFAULT '',
  geo_targeting text DEFAULT '',
  key_competitors text DEFAULT '',
  brand_guidelines_url text DEFAULT '',
  landing_pages text DEFAULT '',
  crm_system text DEFAULT '',
  contact_person text DEFAULT '',
  contact_phone text DEFAULT '',
  contact_email text DEFAULT '',
  payment_terms text DEFAULT '',
  contract_start date,
  contract_end date,
  additional_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.client_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access client_info" ON public.client_info FOR ALL USING (is_agency_admin(auth.uid()));
CREATE POLICY "Agency members view client_info" ON public.client_info FOR SELECT USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Agency members update client_info" ON public.client_info FOR UPDATE USING (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));
CREATE POLICY "Agency members insert client_info" ON public.client_info FOR INSERT WITH CHECK (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));