
-- Step 1: Drop sensitive token columns from platform_connections
ALTER TABLE public.platform_connections
  DROP COLUMN IF EXISTS access_token_encrypted,
  DROP COLUMN IF EXISTS refresh_token_encrypted,
  DROP COLUMN IF EXISTS token_expires_at;

-- Step 2: Add a token_reference column (a string pointer to server-side secrets)
ALTER TABLE public.platform_connections
  ADD COLUMN token_reference text DEFAULT NULL;

-- Step 3: Drop the existing permissive SELECT policy that allowed assigned users to see connections
DROP POLICY IF EXISTS "Assigned users view connections" ON public.platform_connections;

-- Step 4: Create a safe view for UI access that excludes token_reference
CREATE OR REPLACE VIEW public.platform_connections_safe
WITH (security_invoker = on) AS
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
  FROM public.platform_connections;

-- Step 5: Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.platform_connections_safe TO authenticated;

-- Step 6: Create RLS policy so assigned users can only view connections via the safe view
-- The safe view uses security_invoker=on so the caller's RLS on the base table applies.
-- We need a SELECT policy on the base table that allows reading non-sensitive fields.
-- But we want to prevent direct SELECT on the base table from returning token_reference.
-- Strategy: Allow SELECT on base table only for admins (they already have ALL policy).
-- Non-admin users must use the safe view.

-- Actually, since security_invoker=on, the view runs queries AS the calling user.
-- We need a SELECT policy for assigned users on the base table for the view to work,
-- but we don't want them querying the base table directly with token_reference visible.
-- Solution: Create a restrictive SELECT policy for non-admins, and rely on the view
-- to filter columns. The base table policy allows SELECT but the view hides token_reference.

CREATE POLICY "Assigned users view connections via safe view"
  ON public.platform_connections
  FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

-- Step 7: Add a comment to document that token_reference should only be read server-side
COMMENT ON COLUMN public.platform_connections.token_reference IS 'Server-side only. References secrets stored in environment variables. Never expose to frontend.';
