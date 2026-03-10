
-- Table for Facebook CAPI configuration per client
CREATE TABLE IF NOT EXISTS public.client_capi_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  pixel_id text NOT NULL,
  access_token_ref uuid,
  is_active boolean DEFAULT true,
  test_event_code text,
  event_mapping jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.client_capi_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage CAPI config"
ON public.client_capi_config
FOR ALL TO authenticated
USING (public.has_client_access(auth.uid(), client_id))
WITH CHECK (public.has_client_access(auth.uid(), client_id));

-- Vault helpers for CAPI token
CREATE OR REPLACE FUNCTION public.store_capi_token(_secret_value text, _secret_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE _secret_id uuid;
BEGIN
  SELECT vault.create_secret(_secret_value, _secret_name) INTO _secret_id;
  RETURN _secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_capi_token(_secret_ref uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE _val text;
BEGIN
  SELECT decrypted_secret INTO _val FROM vault.decrypted_secrets WHERE id = _secret_ref;
  RETURN _val;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_capi_token(_secret_ref uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = _secret_ref;
END;
$$;
