
-- Fix: Add admin-only checks to secret management RPCs
-- Without this, ANY authenticated user can set/delete provider secrets

CREATE OR REPLACE FUNCTION public.store_ai_provider_secret(_provider_id uuid, _secret_value text, _secret_label text DEFAULT 'api_key')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  _secret_id uuid;
  _secret_name text;
BEGIN
  -- CRITICAL: Only admins can manage provider secrets
  IF NOT is_agency_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can manage provider secrets';
  END IF;

  _secret_name := 'ai_provider_' || _provider_id::text || '_' || _secret_label;
  
  -- Remove old secret if exists
  PERFORM delete_ai_provider_secret(_provider_id, _secret_label);
  
  -- Store in vault
  SELECT vault.create_secret(_secret_value, _secret_name) INTO _secret_id;
  
  -- Store reference
  INSERT INTO public.ai_provider_secrets (provider_id, secret_label, secret_ref)
  VALUES (_provider_id, _secret_label, _secret_id);
  
  -- Audit log
  INSERT INTO public.audit_log (action, entity_type, entity_id, user_id, details)
  VALUES ('ai_provider_secret_set', 'ai_provider', _provider_id::text, auth.uid()::text,
    jsonb_build_object('label', _secret_label, 'action', 'set'));
  
  RETURN _secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_ai_provider_secret(_provider_id uuid, _secret_label text DEFAULT 'api_key')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  _ref uuid;
BEGIN
  -- CRITICAL: Only admins can manage provider secrets
  IF NOT is_agency_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can manage provider secrets';
  END IF;

  SELECT secret_ref INTO _ref
  FROM public.ai_provider_secrets
  WHERE provider_id = _provider_id AND secret_label = _secret_label;
  
  IF _ref IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = _ref;
    DELETE FROM public.ai_provider_secrets
    WHERE provider_id = _provider_id AND secret_label = _secret_label;
    
    -- Audit log
    INSERT INTO public.audit_log (action, entity_type, entity_id, user_id, details)
    VALUES ('ai_provider_secret_removed', 'ai_provider', _provider_id::text, auth.uid()::text,
      jsonb_build_object('label', _secret_label, 'action', 'removed'));
  END IF;
END;
$$;
