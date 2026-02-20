
-- Fix SECURITY DEFINER views by recreating them as SECURITY INVOKER
-- and adding proper RLS policies on the views themselves

-- 1. Recreate platform_connections_safe as SECURITY INVOKER
DROP VIEW IF EXISTS public.platform_connections_safe;

CREATE VIEW public.platform_connections_safe
WITH (security_invoker = true)
AS
  SELECT
    id,
    client_id,
    platform,
    account_name,
    is_active,
    sync_status,
    sync_error,
    last_sync_at,
    created_at,
    updated_at
    -- token_reference intentionally excluded
  FROM public.platform_connections
  WHERE has_client_access(auth.uid(), client_id);

-- 2. Recreate social_media_connections_safe as SECURITY INVOKER
DROP VIEW IF EXISTS public.social_media_connections_safe;

CREATE VIEW public.social_media_connections_safe
WITH (security_invoker = true)
AS
  SELECT
    id,
    platform,
    page_id,
    page_name,
    ig_user_id,
    is_active,
    connected_by,
    connected_at,
    last_refreshed_at,
    token_expires_at
    -- access_token intentionally excluded
  FROM public.social_media_connections
  WHERE is_agency_admin(auth.uid()) OR connected_by = auth.uid();
