
-- ============================================================
-- Phase 1: Fix RLS on all 9 GOS tables + add vault_secret_ref column
-- ============================================================

-- 1. Add vault_secret_ref column to gos_integration_instances
ALTER TABLE public.gos_integration_instances
  ADD COLUMN IF NOT EXISTS vault_secret_ref uuid DEFAULT NULL;

-- ============================================================
-- Drop ALL existing permissive policies on GOS tables
-- ============================================================

-- gos_form_submissions
DROP POLICY IF EXISTS "Authenticated users view submissions" ON public.gos_form_submissions;

-- gos_integrations
DROP POLICY IF EXISTS "Authenticated users view integrations" ON public.gos_integrations;

-- gos_landing_templates (drop any existing)
DROP POLICY IF EXISTS "Authenticated users manage landing_templates" ON public.gos_landing_templates;
DROP POLICY IF EXISTS "gos_landing_templates_all_policy" ON public.gos_landing_templates;

-- gos_forms
DROP POLICY IF EXISTS "Authenticated users manage forms" ON public.gos_forms;
DROP POLICY IF EXISTS "gos_forms_all_policy" ON public.gos_forms;

-- gos_onboarding_flows
DROP POLICY IF EXISTS "Authenticated users manage onboarding_flows" ON public.gos_onboarding_flows;
DROP POLICY IF EXISTS "gos_onboarding_flows_all_policy" ON public.gos_onboarding_flows;

-- gos_onboarding_sessions
DROP POLICY IF EXISTS "Authenticated users manage onboarding_sessions" ON public.gos_onboarding_sessions;
DROP POLICY IF EXISTS "gos_onboarding_sessions_all_policy" ON public.gos_onboarding_sessions;

-- gos_integration_instances
DROP POLICY IF EXISTS "Authenticated users manage integration_instances" ON public.gos_integration_instances;
DROP POLICY IF EXISTS "gos_integration_instances_all_policy" ON public.gos_integration_instances;

-- gos_routing_rules
DROP POLICY IF EXISTS "Authenticated users manage routing_rules" ON public.gos_routing_rules;
DROP POLICY IF EXISTS "gos_routing_rules_all_policy" ON public.gos_routing_rules;

-- gos_routing_log
DROP POLICY IF EXISTS "Authenticated users manage routing_log" ON public.gos_routing_log;
DROP POLICY IF EXISTS "gos_routing_log_all_policy" ON public.gos_routing_log;

-- ============================================================
-- Ensure RLS is enabled on all GOS tables
-- ============================================================
ALTER TABLE public.gos_landing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gos_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gos_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gos_onboarding_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gos_onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gos_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gos_integration_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gos_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gos_routing_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLES WITH client_id: scoped access
-- Pattern: admin full access + client_access for scoped + agency_member for global (null client_id)
-- ============================================================

-- --- gos_landing_templates ---
CREATE POLICY "Admin full access gos_landing_templates"
  ON public.gos_landing_templates FOR ALL TO authenticated
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Members view gos_landing_templates"
  ON public.gos_landing_templates FOR SELECT TO authenticated
  USING (
    client_id IS NULL AND is_agency_member(auth.uid())
    OR client_id IS NOT NULL AND has_client_access(auth.uid(), client_id)
  );

CREATE POLICY "Members insert gos_landing_templates"
  ON public.gos_landing_templates FOR INSERT TO authenticated
  WITH CHECK (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

CREATE POLICY "Members update gos_landing_templates"
  ON public.gos_landing_templates FOR UPDATE TO authenticated
  USING (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

CREATE POLICY "Members delete gos_landing_templates"
  ON public.gos_landing_templates FOR DELETE TO authenticated
  USING (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

-- --- gos_forms ---
CREATE POLICY "Admin full access gos_forms"
  ON public.gos_forms FOR ALL TO authenticated
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Members view gos_forms"
  ON public.gos_forms FOR SELECT TO authenticated
  USING (
    client_id IS NULL AND is_agency_member(auth.uid())
    OR client_id IS NOT NULL AND has_client_access(auth.uid(), client_id)
  );

CREATE POLICY "Members insert gos_forms"
  ON public.gos_forms FOR INSERT TO authenticated
  WITH CHECK (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

CREATE POLICY "Members update gos_forms"
  ON public.gos_forms FOR UPDATE TO authenticated
  USING (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

CREATE POLICY "Members delete gos_forms"
  ON public.gos_forms FOR DELETE TO authenticated
  USING (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

-- --- gos_onboarding_sessions ---
CREATE POLICY "Admin full access gos_onboarding_sessions"
  ON public.gos_onboarding_sessions FOR ALL TO authenticated
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Members view gos_onboarding_sessions"
  ON public.gos_onboarding_sessions FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Members insert gos_onboarding_sessions"
  ON public.gos_onboarding_sessions FOR INSERT TO authenticated
  WITH CHECK (
    is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id)
  );

CREATE POLICY "Members update gos_onboarding_sessions"
  ON public.gos_onboarding_sessions FOR UPDATE TO authenticated
  USING (
    is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id)
  );

-- --- gos_integration_instances ---
CREATE POLICY "Admin full access gos_integration_instances"
  ON public.gos_integration_instances FOR ALL TO authenticated
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Members view gos_integration_instances"
  ON public.gos_integration_instances FOR SELECT TO authenticated
  USING (
    client_id IS NULL AND is_agency_member(auth.uid())
    OR client_id IS NOT NULL AND has_client_access(auth.uid(), client_id)
  );

CREATE POLICY "Members insert gos_integration_instances"
  ON public.gos_integration_instances FOR INSERT TO authenticated
  WITH CHECK (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

CREATE POLICY "Members update gos_integration_instances"
  ON public.gos_integration_instances FOR UPDATE TO authenticated
  USING (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

CREATE POLICY "Members delete gos_integration_instances"
  ON public.gos_integration_instances FOR DELETE TO authenticated
  USING (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

-- --- gos_routing_rules ---
CREATE POLICY "Admin full access gos_routing_rules"
  ON public.gos_routing_rules FOR ALL TO authenticated
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Members view gos_routing_rules"
  ON public.gos_routing_rules FOR SELECT TO authenticated
  USING (
    client_id IS NULL AND is_agency_member(auth.uid())
    OR client_id IS NOT NULL AND has_client_access(auth.uid(), client_id)
  );

CREATE POLICY "Members insert gos_routing_rules"
  ON public.gos_routing_rules FOR INSERT TO authenticated
  WITH CHECK (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

CREATE POLICY "Members update gos_routing_rules"
  ON public.gos_routing_rules FOR UPDATE TO authenticated
  USING (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

CREATE POLICY "Members delete gos_routing_rules"
  ON public.gos_routing_rules FOR DELETE TO authenticated
  USING (
    is_agency_member(auth.uid()) AND (
      client_id IS NULL OR has_client_access(auth.uid(), client_id)
    )
  );

-- ============================================================
-- TABLES WITHOUT client_id: agency-level access
-- ============================================================

-- --- gos_onboarding_flows ---
CREATE POLICY "Admin full access gos_onboarding_flows"
  ON public.gos_onboarding_flows FOR ALL TO authenticated
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Members view gos_onboarding_flows"
  ON public.gos_onboarding_flows FOR SELECT TO authenticated
  USING (is_agency_member(auth.uid()));

-- --- gos_integrations (catalog) ---
CREATE POLICY "Admin full access gos_integrations"
  ON public.gos_integrations FOR ALL TO authenticated
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Members view gos_integrations"
  ON public.gos_integrations FOR SELECT TO authenticated
  USING (is_agency_member(auth.uid()));

-- ============================================================
-- SPECIAL TABLES: backend-driven writes
-- ============================================================

-- --- gos_form_submissions ---
-- SELECT: scoped through parent form's client access
CREATE POLICY "Admin full access gos_form_submissions"
  ON public.gos_form_submissions FOR ALL TO authenticated
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Members view gos_form_submissions"
  ON public.gos_form_submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gos_forms f
      WHERE f.id = gos_form_submissions.form_id
        AND (
          f.client_id IS NULL AND is_agency_member(auth.uid())
          OR f.client_id IS NOT NULL AND has_client_access(auth.uid(), f.client_id)
        )
    )
  );

-- No direct INSERT/UPDATE/DELETE for authenticated users; handled by service_role in edge function

-- --- gos_routing_log ---
-- SELECT: scoped through parent rule's client access
CREATE POLICY "Admin full access gos_routing_log"
  ON public.gos_routing_log FOR ALL TO authenticated
  USING (is_agency_admin(auth.uid()));

CREATE POLICY "Members view gos_routing_log"
  ON public.gos_routing_log FOR SELECT TO authenticated
  USING (
    rule_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.gos_routing_rules r
      WHERE r.id = gos_routing_log.rule_id
        AND (
          r.client_id IS NULL AND is_agency_member(auth.uid())
          OR r.client_id IS NOT NULL AND has_client_access(auth.uid(), r.client_id)
        )
    )
  );

-- No direct INSERT/UPDATE/DELETE for authenticated users; handled by service_role in edge function

-- ============================================================
-- Helper function to store GOS integration secret in vault
-- Reuses existing vault pattern from platform
-- ============================================================
CREATE OR REPLACE FUNCTION public.store_gos_secret(_secret_value text, _secret_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  _secret_id uuid;
BEGIN
  SELECT vault.create_secret(_secret_value, _secret_name) INTO _secret_id;
  RETURN _secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_gos_secret(_secret_ref uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = _secret_ref;
END;
$$;
