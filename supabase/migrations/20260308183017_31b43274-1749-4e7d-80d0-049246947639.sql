
-- Replace the overly-permissive anon token read policy with a secure RPC approach
-- Drop the policy that lets anon read all active tokens
DROP POLICY IF EXISTS "anon_read_own_token" ON public.gos_onboarding_tokens;

-- Create a security definer function that validates a token and returns session info
-- This way anon never directly queries gos_onboarding_tokens
CREATE OR REPLACE FUNCTION public.validate_onboarding_token(p_token text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'session_id', t.session_id,
    'expires_at', t.expires_at,
    'revoked_at', t.revoked_at,
    'client_label', t.client_label
  ) INTO v_result
  FROM gos_onboarding_tokens t
  WHERE t.token = p_token
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  IF (v_result->>'revoked_at') IS NOT NULL THEN
    RETURN json_build_object('error', 'revoked');
  END IF;

  IF (v_result->>'expires_at')::timestamptz < now() THEN
    RETURN json_build_object('error', 'expired');
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute to anon so the embed page can call it
GRANT EXECUTE ON FUNCTION public.validate_onboarding_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_onboarding_token(text) TO authenticated;
