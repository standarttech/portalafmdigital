
-- Improve validate_portal_invite to detect already-accepted invites
CREATE OR REPLACE FUNCTION public.validate_portal_invite(_token text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT * INTO v_invite FROM public.client_portal_invites
  WHERE token = _token LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;
  
  IF v_invite.status = 'accepted' THEN
    RETURN json_build_object('error', 'already_accepted');
  END IF;
  
  IF v_invite.status = 'revoked' THEN
    RETURN json_build_object('error', 'revoked');
  END IF;
  
  IF v_invite.expires_at < now() THEN
    UPDATE public.client_portal_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN json_build_object('error', 'expired');
  END IF;
  
  IF v_invite.status != 'pending' THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;
  
  RETURN json_build_object(
    'id', v_invite.id,
    'client_id', v_invite.client_id,
    'email', v_invite.email,
    'expires_at', v_invite.expires_at
  );
END;
$$;

-- Improve accept_portal_invite to handle full_name from signup
CREATE OR REPLACE FUNCTION public.accept_portal_invite(_invite_id uuid, _user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite record;
  v_portal_user_id uuid;
BEGIN
  SELECT * INTO v_invite FROM public.client_portal_invites
  WHERE id = _invite_id AND status = 'pending';
  
  IF NOT FOUND THEN RETURN json_build_object('error', 'invalid_invite'); END IF;
  IF v_invite.expires_at < now() THEN RETURN json_build_object('error', 'expired'); END IF;
  
  -- Update invite
  UPDATE public.client_portal_invites SET status = 'accepted', accepted_at = now() WHERE id = _invite_id;
  
  -- Create or activate portal user
  INSERT INTO public.client_portal_users (user_id, client_id, email, full_name, status, activated_at)
  VALUES (_user_id, v_invite.client_id, v_invite.email, '', 'active', now())
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_portal_user_id;
  
  -- If already existed, activate and link user_id
  IF v_portal_user_id IS NULL THEN
    UPDATE public.client_portal_users 
    SET status = 'active', activated_at = COALESCE(activated_at, now()), user_id = _user_id, updated_at = now()
    WHERE client_id = v_invite.client_id AND email = v_invite.email
    RETURNING id INTO v_portal_user_id;
  END IF;
  
  RETURN json_build_object('success', true, 'portal_user_id', v_portal_user_id);
END;
$$;
