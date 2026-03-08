-- 1. Add unique constraint on client_portal_users(client_id, email)
ALTER TABLE public.client_portal_users
ADD CONSTRAINT client_portal_users_client_email_unique UNIQUE (client_id, email);

-- 2. Fix accept_portal_invite to verify email match
CREATE OR REPLACE FUNCTION public.accept_portal_invite(_invite_id uuid, _user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite record;
  v_user_email text;
  v_portal_user_id uuid;
BEGIN
  -- Get invite
  SELECT * INTO v_invite FROM public.client_portal_invites
  WHERE id = _invite_id AND status = 'pending';
  
  IF NOT FOUND THEN RETURN json_build_object('error', 'invalid_invite'); END IF;
  IF v_invite.expires_at < now() THEN RETURN json_build_object('error', 'expired'); END IF;
  
  -- Verify email match: the authenticated user's email must match the invite email
  SELECT email INTO v_user_email FROM auth.users WHERE id = _user_id;
  IF v_user_email IS NULL THEN RETURN json_build_object('error', 'invalid_user'); END IF;
  IF lower(v_user_email) != lower(v_invite.email) THEN
    RETURN json_build_object('error', 'email_mismatch');
  END IF;
  
  -- Update invite
  UPDATE public.client_portal_invites SET status = 'accepted', accepted_at = now() WHERE id = _invite_id;
  
  -- Create or activate portal user (using unique constraint on client_id, email)
  INSERT INTO public.client_portal_users (user_id, client_id, email, full_name, status, activated_at)
  VALUES (_user_id, v_invite.client_id, v_invite.email, '', 'active', now())
  ON CONFLICT (client_id, email) DO UPDATE SET
    status = 'active',
    activated_at = COALESCE(client_portal_users.activated_at, now()),
    user_id = _user_id,
    updated_at = now()
  RETURNING id INTO v_portal_user_id;
  
  RETURN json_build_object('success', true, 'portal_user_id', v_portal_user_id);
END;
$$;