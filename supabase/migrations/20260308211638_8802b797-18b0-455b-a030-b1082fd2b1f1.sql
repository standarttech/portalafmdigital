
-- Optimization actions table
CREATE TABLE public.optimization_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  launch_request_id uuid NULL,
  recommendation_id uuid NULL REFERENCES public.ai_recommendations(id) ON DELETE SET NULL,
  external_campaign_id text NULL,
  external_adset_id text NULL,
  external_ad_id text NULL,
  action_type text NOT NULL DEFAULT 'mark_for_review',
  platform text NOT NULL DEFAULT 'meta',
  proposed_by uuid NOT NULL,
  approved_by uuid NULL,
  rejected_by uuid NULL,
  executed_by uuid NULL,
  status text NOT NULL DEFAULT 'proposed',
  rationale text NOT NULL DEFAULT '',
  input_payload jsonb NULL DEFAULT '{}'::jsonb,
  normalized_payload jsonb NULL DEFAULT '{}'::jsonb,
  result_payload jsonb NULL DEFAULT '{}'::jsonb,
  error_message text NULL,
  rejection_reason text NULL,
  executed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_oa_client ON public.optimization_actions(client_id);
CREATE INDEX idx_oa_status ON public.optimization_actions(status);
CREATE INDEX idx_oa_type ON public.optimization_actions(action_type);
CREATE INDEX idx_oa_rec ON public.optimization_actions(recommendation_id);

ALTER TABLE public.optimization_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can manage all optimization actions"
  ON public.optimization_actions FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()))
  WITH CHECK (public.is_agency_admin(auth.uid()));

CREATE POLICY "Users with client access can read optimization actions"
  ON public.optimization_actions FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users with client access can propose optimization actions"
  ON public.optimization_actions FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id) AND proposed_by = auth.uid());

-- Optimization action logs table
CREATE TABLE public.optimization_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.optimization_actions(id) ON DELETE CASCADE,
  step text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'info',
  message text NOT NULL DEFAULT '',
  payload jsonb NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_oal_action ON public.optimization_action_logs(action_id);

ALTER TABLE public.optimization_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can manage all action logs"
  ON public.optimization_action_logs FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()))
  WITH CHECK (public.is_agency_admin(auth.uid()));

CREATE POLICY "Users can read action logs for accessible actions"
  ON public.optimization_action_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.optimization_actions oa
    WHERE oa.id = action_id AND public.has_client_access(auth.uid(), oa.client_id)
  ));

-- Updated_at trigger
CREATE TRIGGER update_optimization_actions_updated_at
  BEFORE UPDATE ON public.optimization_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
