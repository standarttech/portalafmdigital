
-- Allow anon users to read ONLY published forms (for embed pages)
CREATE POLICY "Anon read published forms"
  ON public.gos_forms FOR SELECT TO anon
  USING (status = 'published');

-- Allow anon users to read ONLY published landing templates (for embed pages)
CREATE POLICY "Anon read published landing templates"
  ON public.gos_landing_templates FOR SELECT TO anon
  USING (status = 'published');
