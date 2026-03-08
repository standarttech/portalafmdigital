
-- 1. Update validate_onboarding_token to include show_branding from platform_settings
CREATE OR REPLACE FUNCTION public.validate_onboarding_token(p_token text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
  v_show_branding boolean;
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

  -- Read branding setting safely inside SECURITY DEFINER
  v_show_branding := true;
  BEGIN
    SELECT CASE
      WHEN value IS NOT NULL AND (value::jsonb)->>'enabled' = 'false' THEN false
      ELSE true
    END INTO v_show_branding
    FROM platform_settings
    WHERE key = 'gos_show_branding';
  EXCEPTION WHEN OTHERS THEN
    v_show_branding := true;
  END;

  RETURN json_build_object(
    'session_id', v_result->>'session_id',
    'expires_at', v_result->>'expires_at',
    'client_label', v_result->>'client_label',
    'show_branding', v_show_branding
  );
END;
$$;

-- 2. TTL validation trigger: only allow expires_at within 1-30 days from now
CREATE OR REPLACE FUNCTION public.validate_onboarding_token_ttl()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
DECLARE
  min_expires timestamptz;
  max_expires timestamptz;
BEGIN
  min_expires := now() + interval '30 minutes';
  max_expires := now() + interval '31 days';
  
  IF NEW.expires_at < min_expires THEN
    RAISE EXCEPTION 'Token expiry must be at least 30 minutes from now';
  END IF;
  
  IF NEW.expires_at > max_expires THEN
    RAISE EXCEPTION 'Token expiry cannot exceed 31 days from now';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_token_ttl_on_insert
  BEFORE INSERT ON public.gos_onboarding_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_onboarding_token_ttl();
