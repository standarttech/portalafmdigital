
-- Step 1: Drop the non-admin SELECT policy on the base table
-- Only admins (via ALL policy) should query the base table directly
DROP POLICY IF EXISTS "Assigned users view connections via safe view" ON public.platform_connections;

-- Step 2: Drop the existing safe view and recreate without security_invoker
-- Without security_invoker, the view runs as the owner (bypasses base table RLS)
-- We use has_client_access() in the WHERE clause for row-level filtering
-- This ensures token_reference is never exposed AND access is properly scoped
DROP VIEW IF EXISTS public.platform_connections_safe;

CREATE VIEW public.platform_connections_safe AS
  SELECT
    id,
    client_id,
    platform,
    account_name,
    is_active,
    sync_status,
    last_sync_at,
    sync_error,
    created_at,
    updated_at
  FROM public.platform_connections
  WHERE has_client_access(auth.uid(), client_id);

-- Step 3: Grant SELECT on the safe view to authenticated and anon roles
GRANT SELECT ON public.platform_connections_safe TO authenticated;
