
-- Fix overly permissive RLS: restrict insert/update to service role via is_agency_admin
DROP POLICY IF EXISTS "Service role can insert fb_leadgen_events" ON public.fb_leadgen_events;
DROP POLICY IF EXISTS "Service role can update fb_leadgen_events" ON public.fb_leadgen_events;

-- Insert: allow agency admins or service-level operations (edge functions use service_role key which bypasses RLS)
CREATE POLICY "Agency admins can insert fb_leadgen_events"
  ON public.fb_leadgen_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_agency_admin(auth.uid()));

CREATE POLICY "Agency admins can update fb_leadgen_events"
  ON public.fb_leadgen_events FOR UPDATE
  TO authenticated
  USING (public.is_agency_admin(auth.uid()));
