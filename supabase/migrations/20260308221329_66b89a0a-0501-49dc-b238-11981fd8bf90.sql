
-- Allow portal users to update their own last_login_at
CREATE POLICY "portal_user_update_own_login"
ON public.client_portal_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
