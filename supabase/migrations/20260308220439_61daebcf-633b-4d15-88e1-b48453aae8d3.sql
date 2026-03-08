
-- Client Portal Users
CREATE TABLE public.client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','deactivated')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Client Portal Invites
CREATE TABLE public.client_portal_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Client Portal Branding
CREATE TABLE public.client_portal_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  portal_title text DEFAULT 'Performance Portal',
  logo_url text,
  accent_color text DEFAULT '#D4A843',
  agency_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_branding ENABLE ROW LEVEL SECURITY;

-- Portal users: admins can manage all, portal user can read own
CREATE POLICY "admin_manage_portal_users" ON public.client_portal_users
  FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()))
  WITH CHECK (public.is_agency_admin(auth.uid()));

CREATE POLICY "portal_user_read_own" ON public.client_portal_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Portal invites: admin only
CREATE POLICY "admin_manage_portal_invites" ON public.client_portal_invites
  FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()))
  WITH CHECK (public.is_agency_admin(auth.uid()));

-- Portal branding: admin can manage, portal user can read own client
CREATE POLICY "admin_manage_portal_branding" ON public.client_portal_branding
  FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()))
  WITH CHECK (public.is_agency_admin(auth.uid()));

CREATE POLICY "portal_user_read_branding" ON public.client_portal_branding
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT cpu.client_id FROM public.client_portal_users cpu WHERE cpu.user_id = auth.uid()));

-- Function to validate portal invite token (SECURITY DEFINER, no RLS bypass needed)
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
  WHERE token = _token AND status = 'pending' LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;
  
  IF v_invite.expires_at < now() THEN
    UPDATE public.client_portal_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN json_build_object('error', 'expired');
  END IF;
  
  RETURN json_build_object(
    'id', v_invite.id,
    'client_id', v_invite.client_id,
    'email', v_invite.email,
    'expires_at', v_invite.expires_at
  );
END;
$$;

-- Function to accept portal invite
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
  
  -- If already existed, activate
  IF v_portal_user_id IS NULL THEN
    UPDATE public.client_portal_users SET status = 'active', activated_at = now(), user_id = _user_id
    WHERE client_id = v_invite.client_id AND email = v_invite.email
    RETURNING id INTO v_portal_user_id;
  END IF;
  
  RETURN json_build_object('success', true, 'portal_user_id', v_portal_user_id);
END;
$$;

-- Index for fast lookups
CREATE INDEX idx_portal_users_user_id ON public.client_portal_users(user_id);
CREATE INDEX idx_portal_users_client_id ON public.client_portal_users(client_id);
CREATE INDEX idx_portal_invites_token ON public.client_portal_invites(token);
CREATE INDEX idx_portal_invites_client_id ON public.client_portal_invites(client_id);
