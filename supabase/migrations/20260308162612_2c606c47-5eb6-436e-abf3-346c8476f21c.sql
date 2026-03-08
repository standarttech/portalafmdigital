-- =====================================================
-- CRITICAL FIX: Remove old permissive `true` policies
-- These policies were supposed to be dropped but weren't,
-- bypassing all the new proper RLS policies.
-- =====================================================

-- gos_landing_templates
DROP POLICY IF EXISTS "Authenticated users manage landing templates" ON public.gos_landing_templates;

-- gos_integration_instances
DROP POLICY IF EXISTS "Authenticated users manage integration instances" ON public.gos_integration_instances;

-- gos_onboarding_flows
DROP POLICY IF EXISTS "Authenticated users manage onboarding flows" ON public.gos_onboarding_flows;

-- gos_onboarding_sessions
DROP POLICY IF EXISTS "Authenticated users manage onboarding sessions" ON public.gos_onboarding_sessions;

-- gos_routing_rules
DROP POLICY IF EXISTS "Authenticated users manage routing rules" ON public.gos_routing_rules;

-- gos_routing_log
DROP POLICY IF EXISTS "Authenticated users view routing log" ON public.gos_routing_log;