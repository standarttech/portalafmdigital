
-- Create crm_external_connections table
CREATE TABLE public.crm_external_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'custom',
  label text NOT NULL DEFAULT '',
  api_key_ref uuid,
  base_url text,
  sync_enabled boolean NOT NULL DEFAULT true,
  sync_interval_minutes integer NOT NULL DEFAULT 60,
  last_synced_at timestamptz,
  last_sync_status text DEFAULT 'pending',
  last_sync_error text,
  field_mapping jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add bot_profile_id to notification_broadcasts
ALTER TABLE public.notification_broadcasts 
  ADD COLUMN bot_profile_id uuid REFERENCES public.crm_bot_profiles(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.crm_external_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies: agency members with client access
CREATE POLICY "Users with client access can view crm_external_connections"
  ON public.crm_external_connections FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users with client access can insert crm_external_connections"
  ON public.crm_external_connections FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users with client access can update crm_external_connections"
  ON public.crm_external_connections FOR UPDATE TO authenticated
  USING (public.has_client_access(auth.uid(), client_id))
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users with client access can delete crm_external_connections"
  ON public.crm_external_connections FOR DELETE TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- updated_at trigger
CREATE TRIGGER update_crm_external_connections_updated_at
  BEFORE UPDATE ON public.crm_external_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vault helper functions for CRM connections
CREATE OR REPLACE FUNCTION public.store_crm_connection_secret(_secret_value text, _secret_name text)
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

CREATE OR REPLACE FUNCTION public.delete_crm_connection_secret(_secret_ref uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'vault'
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = _secret_ref;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_crm_connection_secret(_secret_ref uuid)
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
