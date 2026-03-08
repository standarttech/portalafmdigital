
-- Remove the overly permissive UPDATE policy
DROP POLICY IF EXISTS "portal_user_update_own_login" ON public.client_portal_users;

-- Create a SECURITY DEFINER function to safely update last_login_at only
CREATE OR REPLACE FUNCTION public.update_portal_last_login(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.client_portal_users
  SET last_login_at = now()
  WHERE user_id = _user_id AND status = 'active';
END;
$$;
