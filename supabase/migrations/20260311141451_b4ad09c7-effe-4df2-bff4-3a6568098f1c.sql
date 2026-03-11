
-- Table for scheduled report configurations per client
CREATE TABLE IF NOT EXISTS public.client_report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  report_type text NOT NULL DEFAULT 'weekly', -- 'weekly' | 'monthly'
  telegram_chat_id text, -- Telegram chat where to send
  telegram_bot_profile_id uuid, -- optional: which bot to use
  is_active boolean NOT NULL DEFAULT true,
  sections jsonb NOT NULL DEFAULT '["kpi_summary","daily_table","campaigns_list"]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, report_type)
);

ALTER TABLE public.client_report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view report schedules"
  ON public.client_report_schedules FOR SELECT
  TO authenticated
  USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency admins can manage report schedules"
  ON public.client_report_schedules FOR ALL
  TO authenticated
  USING (is_agency_admin(auth.uid()))
  WITH CHECK (is_agency_admin(auth.uid()));

-- Table for Freepik integration config
CREATE TABLE IF NOT EXISTS public.platform_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type text NOT NULL, -- 'freepik' | 'meta_ads_management'
  display_name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref uuid, -- vault reference for API key
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_type)
);

ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view integrations"
  ON public.platform_integrations FOR SELECT
  TO authenticated
  USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency admins can manage integrations"
  ON public.platform_integrations FOR ALL
  TO authenticated
  USING (is_agency_admin(auth.uid()))
  WITH CHECK (is_agency_admin(auth.uid()));

-- Vault helper for platform integrations
CREATE OR REPLACE FUNCTION public.store_platform_integration_secret(_integration_type text, _secret_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  _secret_id uuid;
  _old_ref uuid;
BEGIN
  IF NOT is_agency_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can manage integration secrets';
  END IF;

  -- Remove old secret if exists
  SELECT secret_ref INTO _old_ref FROM public.platform_integrations WHERE integration_type = _integration_type;
  IF _old_ref IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = _old_ref;
  END IF;

  SELECT vault.create_secret(_secret_value, 'integration_' || _integration_type) INTO _secret_id;
  
  INSERT INTO public.platform_integrations (integration_type, display_name, secret_ref, is_active, created_by)
  VALUES (_integration_type, _integration_type, _secret_id, true, auth.uid())
  ON CONFLICT (integration_type) DO UPDATE SET secret_ref = _secret_id, is_active = true, updated_at = now();
  
  RETURN _secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_integration_secret(_integration_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  _ref uuid;
  _val text;
BEGIN
  SELECT secret_ref INTO _ref FROM public.platform_integrations WHERE integration_type = _integration_type;
  IF _ref IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO _val FROM vault.decrypted_secrets WHERE id = _ref;
  RETURN _val;
END;
$$;
