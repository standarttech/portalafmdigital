
-- FIX 1: Remove overly permissive public SELECT on invitations (ERROR: invitations_public_read)
-- InvitePage uses get_invitation_by_token RPC (SECURITY DEFINER) which bypasses RLS,
-- so the public SELECT policy is unnecessary and exposes all invitation tokens.
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.invitations;

-- FIX 2: Create safe view for client_webhooks excluding secret (WARN: webhook_secrets_visible)
CREATE OR REPLACE VIEW public.client_webhooks_safe
WITH (security_invoker = true)
AS
SELECT
  id, client_id, name, url, events, is_active, headers,
  created_at, updated_at, created_by,
  last_triggered_at, last_status_code, failure_count,
  (secret IS NOT NULL) AS has_secret
FROM public.client_webhooks;
