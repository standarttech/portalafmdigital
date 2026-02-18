-- Update agency_role enum to include new roles
-- Note: We need to add new roles. Since PostgreSQL enums can only be extended (not modified),
-- we add the new values to the existing enum.
ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'Manager';
ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'SalesManager';
ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'AccountManager';
ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'Designer';
ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'Copywriter';

-- Create a storage bucket for branding assets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for branding bucket
CREATE POLICY "Public branding read" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "Admins upload branding" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'branding' AND public.is_agency_admin(auth.uid()));
CREATE POLICY "Admins update branding" ON storage.objects FOR UPDATE USING (bucket_id = 'branding' AND public.is_agency_admin(auth.uid()));
CREATE POLICY "Admins delete branding" ON storage.objects FOR DELETE USING (bucket_id = 'branding' AND public.is_agency_admin(auth.uid()));
