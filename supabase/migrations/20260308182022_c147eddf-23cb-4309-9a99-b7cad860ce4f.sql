
-- Add revoked_at column to gos_onboarding_tokens
ALTER TABLE public.gos_onboarding_tokens ADD COLUMN IF NOT EXISTS revoked_at timestamptz DEFAULT NULL;

-- Add client_label column for safe external display (no FK to clients)
ALTER TABLE public.gos_onboarding_tokens ADD COLUMN IF NOT EXISTS client_label text DEFAULT NULL;

-- Update the security definer function to also check revoked_at
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
      AND revoked_at IS NULL
  )
$$;
