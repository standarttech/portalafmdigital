-- Create safe view for social_media_connections that excludes access_token
CREATE OR REPLACE VIEW public.social_media_connections_safe AS
SELECT
  id,
  platform,
  page_id,
  page_name,
  ig_user_id,
  connected_by,
  connected_at,
  last_refreshed_at,
  token_expires_at,
  is_active
FROM public.social_media_connections;

-- Grant access to authenticated users
GRANT SELECT ON public.social_media_connections_safe TO authenticated;

-- Drop the existing SELECT policy for agency members on the base table 
-- (they should use the safe view instead)
DROP POLICY IF EXISTS "Agency members view social connections" ON public.social_media_connections;

-- Only admins retain direct table access (needed for token operations via service role)
-- Agency members access data through the safe view
