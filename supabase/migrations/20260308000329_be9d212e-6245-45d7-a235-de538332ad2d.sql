
CREATE TABLE public.admin_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_scales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scales" ON public.admin_scales
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all scales" ON public.admin_scales
  FOR SELECT TO authenticated
  USING (is_agency_admin(auth.uid()));
