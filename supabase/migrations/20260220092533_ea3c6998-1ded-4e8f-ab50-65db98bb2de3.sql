-- Table for social media OAuth connections
CREATE TABLE IF NOT EXISTS public.social_media_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  page_id TEXT,
  page_name TEXT,
  ig_user_id TEXT,
  connected_by UUID NOT NULL,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_refreshed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(platform)
);

ALTER TABLE public.social_media_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins manage social connections"
ON public.social_media_connections
FOR ALL
USING (is_agency_admin(auth.uid()))
WITH CHECK (is_agency_admin(auth.uid()));

CREATE POLICY "Agency members view social connections"
ON public.social_media_connections
FOR SELECT
USING (is_agency_member(auth.uid()));