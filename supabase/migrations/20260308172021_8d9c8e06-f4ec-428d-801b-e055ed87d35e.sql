
-- Fix overly permissive RLS on gos_health_check_log insert
DROP POLICY IF EXISTS "service_insert_health_logs" ON public.gos_health_check_log;

-- Only edge functions with service role can insert; agency members can also insert
CREATE POLICY "agency_insert_health_logs" ON public.gos_health_check_log
  FOR INSERT WITH CHECK (is_agency_member(auth.uid()));

-- Fix: gos_onboarding_tokens public read is intentional (for token validation) 
-- but restrict to non-expired only
DROP POLICY IF EXISTS "public_read_onboarding_tokens" ON public.gos_onboarding_tokens;
CREATE POLICY "public_read_valid_tokens" ON public.gos_onboarding_tokens
  FOR SELECT USING (expires_at > now());
