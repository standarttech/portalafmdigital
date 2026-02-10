
-- Fix 1: Replace overpermissive invitations SELECT policy with secure RPC
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.invitations;

-- Create RPC to validate specific token (no longer exposes all invitations)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email, role, status, expires_at
  FROM public.invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
$$;

-- Also need a way for InvitePage to read client_id and permissions after sign-in
-- The admin policy still allows admins full access
-- For the invite flow, the RPC returns what's needed

-- Create a second RPC for fetching invitation details after auth (client_id, permissions)
CREATE OR REPLACE FUNCTION public.get_invitation_details(_invitation_id UUID)
RETURNS TABLE (
  client_id UUID,
  permissions JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id, permissions
  FROM public.invitations
  WHERE id = _invitation_id
    AND status = 'pending'
  LIMIT 1;
$$;

-- Create RPC to mark invitation as accepted
CREATE OR REPLACE FUNCTION public.accept_invitation(_invitation_id UUID)
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = _invitation_id;
$$;

-- Fix 2: Fix access_requests policies - make them PERMISSIVE with correct scoping
-- Current policies are RESTRICTIVE which may cause issues
DROP POLICY IF EXISTS "Admins manage access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Anyone can submit access request" ON public.access_requests;

-- Admins can read/manage all access requests
CREATE POLICY "Admins manage access requests"
  ON public.access_requests
  FOR ALL
  TO authenticated
  USING (is_agency_admin(auth.uid()))
  WITH CHECK (is_agency_admin(auth.uid()));

-- Anyone (including anon) can submit an access request but NOT read
CREATE POLICY "Anyone can submit access request"
  ON public.access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
