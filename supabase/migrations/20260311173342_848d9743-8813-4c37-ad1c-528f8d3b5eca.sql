-- Allow anonymous (unauthenticated) users to read published reports by ID
CREATE POLICY "Public can view published reports"
  ON public.reports FOR SELECT
  TO anon
  USING (status = 'published');
