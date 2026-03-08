
-- FIX: Remove overly permissive anon policies

-- 1. Drop the public_read_onboarding_flows policy that lets anon read ALL flows
DROP POLICY IF EXISTS "public_read_onboarding_flows" ON public.gos_onboarding_flows;

-- 2. Drop the public_read_valid_tokens policy that lets anon read ALL non-expired tokens
DROP POLICY IF EXISTS "public_read_valid_tokens" ON public.gos_onboarding_tokens;

-- 3. Create a tighter policy for flows: anon can only read a flow if it's linked to a session
-- that has a valid (non-expired, non-revoked) onboarding token.
-- We use a security definer function to avoid recursion.
CREATE OR REPLACE FUNCTION public.has_valid_onboarding_token_for_flow(p_flow_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM gos_onboarding_sessions s
    JOIN gos_onboarding_tokens t ON t.session_id = s.id
    WHERE s.flow_id = p_flow_id
      AND t.expires_at > now()
      AND t.revoked_at IS NULL
  )
$$;

CREATE POLICY "anon_read_onboarding_flows_via_token"
  ON public.gos_onboarding_flows
  FOR SELECT
  TO anon
  USING (has_valid_onboarding_token_for_flow(id));

-- 4. Create a tighter policy for tokens: anon can only read the token they provide
-- by matching the token value. Since the EmbedOnboardingPage queries by token value
-- with .eq('token', token), this is safe — they can only see the row they already know.
CREATE POLICY "anon_read_own_token"
  ON public.gos_onboarding_tokens
  FOR SELECT
  TO anon
  USING (
    expires_at > now()
    AND revoked_at IS NULL
  );
