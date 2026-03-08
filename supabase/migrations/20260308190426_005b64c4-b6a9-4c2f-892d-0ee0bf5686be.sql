
-- GOS Audit Log table for Phase 6
CREATE TABLE public.gos_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_role text,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_name text,
  client_id uuid,
  before_summary jsonb,
  after_summary jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_gos_audit_log_created ON public.gos_audit_log(created_at DESC);
CREATE INDEX idx_gos_audit_log_entity ON public.gos_audit_log(entity_type, entity_id);
CREATE INDEX idx_gos_audit_log_actor ON public.gos_audit_log(actor_user_id);

-- RLS: only authenticated agency members can read, insert their own
ALTER TABLE public.gos_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can read audit log"
  ON public.gos_audit_log FOR SELECT
  TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Agency members can insert audit log"
  ON public.gos_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());
