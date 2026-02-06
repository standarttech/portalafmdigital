
-- =============================================
-- ACCESS REQUESTS TABLE
-- =============================================
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a request (unauthenticated)
CREATE POLICY "Anyone can submit access request"
  ON public.access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view/manage requests
CREATE POLICY "Admins manage access requests"
  ON public.access_requests
  FOR ALL
  TO authenticated
  USING (is_agency_admin(auth.uid()));

-- =============================================
-- INVITATIONS TABLE
-- =============================================
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  role TEXT NOT NULL DEFAULT 'MediaBuyer' CHECK (role IN ('MediaBuyer', 'Client')),
  client_id UUID REFERENCES public.clients(id),
  permissions JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invitations
CREATE POLICY "Admins manage invitations"
  ON public.invitations
  FOR ALL
  TO authenticated
  USING (is_agency_admin(auth.uid()));

-- Anyone can read invitation by token (for accepting)
CREATE POLICY "Anyone can read invitation by token"
  ON public.invitations
  FOR SELECT
  TO anon, authenticated
  USING (true);
