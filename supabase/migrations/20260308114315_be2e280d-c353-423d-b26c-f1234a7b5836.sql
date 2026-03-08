
-- 1. Fix PRIVILEGE ESCALATION: user_settings - restrict UPDATE to safe fields only
DROP POLICY IF EXISTS "Users manage own settings" ON public.user_settings;

CREATE POLICY "Users select own settings" ON public.user_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own safe fields" ON public.user_settings
  FOR UPDATE USING (user_id = auth.uid());

-- Revoke direct update on security-sensitive columns via a trigger
CREATE OR REPLACE FUNCTION public.protect_user_settings_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  -- Non-admins cannot change security fields
  IF NOT is_agency_admin(auth.uid()) THEN
    NEW.bypass_dual_approval := OLD.bypass_dual_approval;
    NEW.force_password_change := OLD.force_password_change;
    NEW.needs_password_setup := OLD.needs_password_setup;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS protect_user_settings ON public.user_settings;
CREATE TRIGGER protect_user_settings
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_settings_fields();

-- 2. Fix WEBHOOK SECRET exposure: restrict member SELECT on client_webhooks to use safe view
DROP POLICY IF EXISTS "Agency members can view webhooks for their clients" ON public.client_webhooks;

-- 3. Fix CRM WEBHOOK SECRET exposure
DROP POLICY IF EXISTS "Agency members view crm_webhook_endpoints" ON public.crm_webhook_endpoints;

-- Create safe view for crm_webhook_endpoints
CREATE OR REPLACE VIEW public.crm_webhook_endpoints_safe
WITH (security_invoker = true)
AS
SELECT id, client_id, pipeline_id, default_stage_id, is_active, field_mapping,
  created_at, updated_at, name, endpoint_slug, source_label,
  (secret_key IS NOT NULL AND secret_key != '') AS has_secret
FROM public.crm_webhook_endpoints
WHERE has_client_access(auth.uid(), client_id);

-- Re-add member SELECT without secret for client_webhooks (admin policy already covers full access)
-- Members should use client_webhooks_safe view instead
