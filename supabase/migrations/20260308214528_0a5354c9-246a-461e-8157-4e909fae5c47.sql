
-- Storage bucket for creative assets
INSERT INTO storage.buckets (id, name, public) VALUES ('creative-assets', 'creative-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for creative-assets bucket
CREATE POLICY "Authenticated users can upload creative assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'creative-assets');

CREATE POLICY "Anyone can read creative assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'creative-assets');

CREATE POLICY "Admins can delete creative assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'creative-assets' AND public.is_agency_admin(auth.uid()));

-- Add preset effectiveness tracking columns
ALTER TABLE public.optimization_presets ADD COLUMN IF NOT EXISTS trigger_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.optimization_presets ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz;
