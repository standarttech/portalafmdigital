-- Allow portal users to INSERT audit events (but not read them)
CREATE POLICY "portal_users_insert_audit"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_portal_users
    WHERE client_portal_users.user_id = auth.uid()
      AND client_portal_users.status = 'active'
  )
);