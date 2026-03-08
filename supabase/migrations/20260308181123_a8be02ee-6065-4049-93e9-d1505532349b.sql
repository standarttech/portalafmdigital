
-- Security definer function: check if a session is accessible via a valid onboarding token
CREATE OR REPLACE FUNCTION public.has_valid_onboarding_token(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gos_onboarding_tokens
    WHERE session_id = p_session_id
      AND expires_at > now()
  )
$$;

-- Allow anonymous users to SELECT onboarding sessions that have a valid token
CREATE POLICY "public_read_onboarding_via_token"
ON public.gos_onboarding_sessions
FOR SELECT
TO anon
USING (has_valid_onboarding_token(id));

-- Allow anonymous users to UPDATE onboarding sessions that have a valid token
CREATE POLICY "public_update_onboarding_via_token"
ON public.gos_onboarding_sessions
FOR UPDATE
TO anon
USING (has_valid_onboarding_token(id))
WITH CHECK (has_valid_onboarding_token(id));

-- Allow anonymous users to read onboarding flows (needed to load step definitions)
CREATE POLICY "public_read_onboarding_flows"
ON public.gos_onboarding_flows
FOR SELECT
TO anon
USING (true);

-- Storage: allow anonymous upload to gos-onboarding-files bucket
CREATE POLICY "anon_upload_onboarding_files"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'gos-onboarding-files');

-- Storage: allow anonymous read from gos-onboarding-files bucket
CREATE POLICY "anon_read_onboarding_files"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'gos-onboarding-files');
