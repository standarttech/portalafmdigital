
-- Add default_model to ai_providers
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS default_model text DEFAULT '';

-- Add model_override to ai_provider_routes
ALTER TABLE public.ai_provider_routes ADD COLUMN IF NOT EXISTS model_override text DEFAULT '';

-- Add last_tested_at and last_test_status to ai_providers for honest status display
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS last_tested_at timestamptz;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS last_test_status text DEFAULT '';
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS last_test_error text DEFAULT '';

-- Create function to store ai provider secret securely via vault
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
  -- Generate a unique vault name
  _secret_name := 'ai_provider_' || _provider_id::text || '_' || _secret_label;
  
  -- Check if provider already has a secret with this label - remove old one first
  PERFORM delete_ai_provider_secret(_provider_id, _secret_label);
  
  -- Store in vault
  SELECT vault.create_secret(_secret_value, _secret_name) INTO _secret_id;
  
  -- Store reference in ai_provider_secrets
  INSERT INTO public.ai_provider_secrets (provider_id, secret_label, secret_ref)
  VALUES (_provider_id, _secret_label, _secret_id::text);
  
  RETURN _secret_id;
END;
$$;

-- Create function to delete ai provider secret
CREATE OR REPLACE FUNCTION public.delete_ai_provider_secret(_provider_id uuid, _secret_label text DEFAULT 'api_key')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  _ref text;
BEGIN
  -- Find existing secret ref
  SELECT secret_ref INTO _ref
  FROM public.ai_provider_secrets
  WHERE provider_id = _provider_id AND secret_label = _secret_label;
  
  IF _ref IS NOT NULL THEN
    -- Delete from vault
    DELETE FROM vault.secrets WHERE id = _ref::uuid;
    -- Delete from ai_provider_secrets
    DELETE FROM public.ai_provider_secrets
    WHERE provider_id = _provider_id AND secret_label = _secret_label;
  END IF;
END;
$$;

-- Create function to check if provider has a configured secret (without revealing it)
CREATE OR REPLACE FUNCTION public.ai_provider_has_secret(_provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ai_provider_secrets
    WHERE provider_id = _provider_id AND secret_ref IS NOT NULL
  );
$$;
