
-- User presence tracking
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false,
  current_page text
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all presence" ON public.user_presence
  FOR SELECT TO authenticated USING (is_agency_admin(auth.uid()));

CREATE POLICY "Users manage own presence" ON public.user_presence
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User activity log for meaningful actions
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  entity_name text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all activity" ON public.user_activity_log
  FOR SELECT TO authenticated USING (is_agency_admin(auth.uid()));

CREATE POLICY "Users insert own activity" ON public.user_activity_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own activity" ON public.user_activity_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());
