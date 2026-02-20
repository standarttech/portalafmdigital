
-- Migrate social_media_connections tokens to Vault encrypted storage
-- Step 1: Add token_reference column (like platform_connections pattern)
ALTER TABLE public.social_media_connections
  ADD COLUMN IF NOT EXISTS token_reference uuid;

-- Step 2: Helper function to store a token in Vault and return its UUID reference
-- Only callable server-side (service role), not exposed to RLS-restricted users
CREATE OR REPLACE FUNCTION public.store_social_token(
  _secret_value text,
  _secret_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _secret_id uuid;
BEGIN
  -- Store in vault.secrets and return the UUID
  SELECT vault.create_secret(_secret_value, _secret_name) INTO _secret_id;
  RETURN _secret_id;
END;
$$;

-- Step 3: Helper function to retrieve a decrypted token from Vault by reference UUID
-- Only callable server-side (service role)
CREATE OR REPLACE FUNCTION public.get_social_token(
  _token_reference uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _decrypted_secret text;
BEGIN
  SELECT decrypted_secret INTO _decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = _token_reference;
  RETURN _decrypted_secret;
END;
$$;

-- Step 4: Helper function to delete a Vault secret by reference UUID (for disconnect)
CREATE OR REPLACE FUNCTION public.delete_social_token(
  _token_reference uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = _token_reference;
END;
$$;

-- Revoke public/anon access to these functions — only service role should call them
REVOKE ALL ON FUNCTION public.store_social_token(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_social_token(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_social_token(uuid) FROM PUBLIC, anon, authenticated;
