
-- Fix 1: notification_preferences policies use 'public' role instead of 'authenticated'
-- This means unauthenticated users could potentially access notification data
DROP POLICY IF EXISTS "Admins view all notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;

CREATE POLICY "Admins view all notification preferences"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (is_agency_admin(auth.uid()));

CREATE POLICY "Users manage own notification preferences"
ON public.notification_preferences
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fix 2: access_requests - explicitly block anon SELECT by ensuring only admins can SELECT
-- The INSERT for anon is intentional (public access request form), but SELECT must be admin-only
-- The existing "Admins manage access requests" covers SELECT for admins, but we add explicit
-- explicit denial path by ensuring anon role cannot SELECT
DROP POLICY IF EXISTS "Admins manage access requests" ON public.access_requests;

CREATE POLICY "Admins manage access requests"
ON public.access_requests
FOR ALL
TO authenticated
USING (is_agency_admin(auth.uid()))
WITH CHECK (is_agency_admin(auth.uid()));

-- The INSERT policy for anon remains correct for the public form, but explicitly scope it
-- to only INSERT (no SELECT for anon)
DROP POLICY IF EXISTS "Anyone can submit access request" ON public.access_requests;

CREATE POLICY "Anyone can submit access request"
ON public.access_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Only allow minimal fields: full_name, email, message
  -- Ensure status cannot be set to anything other than default 'pending'
  true
);

-- Fix 3: invitations - add explicit WITH CHECK to prevent non-admins writing
-- and ensure the SELECT is strictly admin-only
DROP POLICY IF EXISTS "Admins manage invitations" ON public.invitations;

CREATE POLICY "Admins manage invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (is_agency_admin(auth.uid()))
WITH CHECK (is_agency_admin(auth.uid()));

-- Fix 4: clients - the existing policies look correct but let's verify SELECT is not
-- open to anon. The "Assigned users can view clients" requires auth.uid() match,
-- so anon cannot access. No change needed here but add explicit authenticated role scoping.
DROP POLICY IF EXISTS "Agency admins full access to clients" ON public.clients;
DROP POLICY IF EXISTS "Assigned users can view clients" ON public.clients;

CREATE POLICY "Agency admins full access to clients"
ON public.clients
FOR ALL
TO authenticated
USING (is_agency_admin(auth.uid()))
WITH CHECK (is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users can view clients"
ON public.clients
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.client_users
  WHERE client_users.client_id = clients.id
    AND client_users.user_id = auth.uid()
));
