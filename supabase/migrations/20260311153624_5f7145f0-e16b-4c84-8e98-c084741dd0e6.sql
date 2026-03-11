-- Add Facebook attribution fields to crm_leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS fbclid text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS fbc text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS fbp text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS fb_lead_id text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS fb_ad_id text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS fb_adset_id text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS fb_campaign_id text;

-- Enable realtime for invitations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;