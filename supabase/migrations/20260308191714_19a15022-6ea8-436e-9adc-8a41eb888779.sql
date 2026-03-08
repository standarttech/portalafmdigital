
-- =============================================
-- Phase 7A: AI Ads Copilot Schema Foundation
-- =============================================

-- Permission flag for AI Ads module
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS can_access_ai_ads boolean NOT NULL DEFAULT false;

-- 1. AI Campaign Sessions (chat-like AI workspace sessions)
CREATE TABLE public.ai_campaign_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'New Session',
  status text NOT NULL DEFAULT 'active',
  session_type text NOT NULL DEFAULT 'analysis',
  created_by uuid NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. AI Analysis Runs
CREATE TABLE public.ai_analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.ai_campaign_sessions(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  ad_account_id uuid REFERENCES public.ad_accounts(id) ON DELETE SET NULL,
  prompt text NOT NULL DEFAULT '',
  result_summary text,
  result_data jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  model_used text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 3. AI Recommendations
CREATE TABLE public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid REFERENCES public.ai_analysis_runs(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.ai_campaign_sessions(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  recommendation_type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  acted_on_at timestamptz
);

-- 4. Hypothesis Threads
CREATE TABLE public.hypothesis_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  ad_account_id uuid REFERENCES public.ad_accounts(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  tags text[] DEFAULT '{}',
  linked_campaign_ids text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Hypothesis Messages
CREATE TABLE public.hypothesis_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.hypothesis_threads(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Campaign Drafts
CREATE TABLE public.campaign_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  ad_account_id uuid REFERENCES public.ad_accounts(id) ON DELETE SET NULL,
  recommendation_id uuid REFERENCES public.ai_recommendations(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.ai_campaign_sessions(id) ON DELETE SET NULL,
  name text NOT NULL,
  draft_type text NOT NULL DEFAULT 'campaign',
  status text NOT NULL DEFAULT 'draft',
  platform text NOT NULL DEFAULT 'meta',
  config jsonb DEFAULT '{}',
  notes text DEFAULT '',
  created_by uuid NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Campaign Draft Items (ad sets, ads within a draft)
CREATE TABLE public.campaign_draft_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES public.campaign_drafts(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL DEFAULT 'adset',
  name text NOT NULL,
  config jsonb DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Launch Requests
CREATE TABLE public.launch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES public.campaign_drafts(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending_approval',
  priority text NOT NULL DEFAULT 'normal',
  notes text DEFAULT '',
  approved_by uuid,
  approved_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz,
  rejection_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Launch Execution Logs
CREATE TABLE public.launch_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_request_id uuid REFERENCES public.launch_requests(id) ON DELETE CASCADE NOT NULL,
  step text NOT NULL DEFAULT 'init',
  status text NOT NULL DEFAULT 'pending',
  message text,
  response_data jsonb DEFAULT '{}',
  executed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.ai_campaign_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hypothesis_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hypothesis_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_draft_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_execution_logs ENABLE ROW LEVEL SECURITY;

-- Agency members with client access can read; creators can insert/update
-- ai_campaign_sessions
CREATE POLICY "Agency members read sessions" ON public.ai_campaign_sessions
  FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency members insert sessions" ON public.ai_campaign_sessions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id) AND created_by = auth.uid());

CREATE POLICY "Admins or creators update sessions" ON public.ai_campaign_sessions
  FOR UPDATE TO authenticated
  USING (public.is_agency_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Admins delete sessions" ON public.ai_campaign_sessions
  FOR DELETE TO authenticated
  USING (public.is_agency_admin(auth.uid()));

-- ai_analysis_runs
CREATE POLICY "Agency members read analysis" ON public.ai_analysis_runs
  FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency members insert analysis" ON public.ai_analysis_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id) AND created_by = auth.uid());

CREATE POLICY "Admins or creators update analysis" ON public.ai_analysis_runs
  FOR UPDATE TO authenticated
  USING (public.is_agency_admin(auth.uid()) OR created_by = auth.uid());

-- ai_recommendations
CREATE POLICY "Agency members read recommendations" ON public.ai_recommendations
  FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency members insert recommendations" ON public.ai_recommendations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins or creators update recommendations" ON public.ai_recommendations
  FOR UPDATE TO authenticated
  USING (public.is_agency_admin(auth.uid()));

-- hypothesis_threads
CREATE POLICY "Agency members read threads" ON public.hypothesis_threads
  FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency members insert threads" ON public.hypothesis_threads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id) AND created_by = auth.uid());

CREATE POLICY "Admins or creators update threads" ON public.hypothesis_threads
  FOR UPDATE TO authenticated
  USING (public.is_agency_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Admins delete threads" ON public.hypothesis_threads
  FOR DELETE TO authenticated
  USING (public.is_agency_admin(auth.uid()));

-- hypothesis_messages (access via thread → client_id)
CREATE POLICY "Read messages via thread" ON public.hypothesis_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hypothesis_threads t
    WHERE t.id = thread_id AND public.has_client_access(auth.uid(), t.client_id)
  ));

CREATE POLICY "Insert messages via thread" ON public.hypothesis_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.hypothesis_threads t
    WHERE t.id = thread_id AND public.has_client_access(auth.uid(), t.client_id)
  ));

-- campaign_drafts
CREATE POLICY "Agency members read drafts" ON public.campaign_drafts
  FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency members insert drafts" ON public.campaign_drafts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id) AND created_by = auth.uid());

CREATE POLICY "Admins or creators update drafts" ON public.campaign_drafts
  FOR UPDATE TO authenticated
  USING (public.is_agency_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Admins delete drafts" ON public.campaign_drafts
  FOR DELETE TO authenticated
  USING (public.is_agency_admin(auth.uid()));

-- campaign_draft_items (access via draft → client_id)
CREATE POLICY "Read draft items via draft" ON public.campaign_draft_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_drafts d
    WHERE d.id = draft_id AND public.has_client_access(auth.uid(), d.client_id)
  ));

CREATE POLICY "Insert draft items via draft" ON public.campaign_draft_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaign_drafts d
    WHERE d.id = draft_id AND public.has_client_access(auth.uid(), d.client_id)
  ));

CREATE POLICY "Update draft items" ON public.campaign_draft_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_drafts d
    WHERE d.id = draft_id AND (public.is_agency_admin(auth.uid()) OR d.created_by = auth.uid())
  ));

CREATE POLICY "Delete draft items" ON public.campaign_draft_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_drafts d
    WHERE d.id = draft_id AND public.is_agency_admin(auth.uid())
  ));

-- launch_requests
CREATE POLICY "Agency members read launch requests" ON public.launch_requests
  FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency members create launch requests" ON public.launch_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id) AND requested_by = auth.uid());

CREATE POLICY "Admins update launch requests" ON public.launch_requests
  FOR UPDATE TO authenticated
  USING (public.is_agency_admin(auth.uid()));

-- launch_execution_logs (access via launch_request → client_id)
CREATE POLICY "Read execution logs" ON public.launch_execution_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.launch_requests lr
    WHERE lr.id = launch_request_id AND public.has_client_access(auth.uid(), lr.client_id)
  ));

CREATE POLICY "Insert execution logs" ON public.launch_execution_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_admin(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER set_updated_at_ai_sessions BEFORE UPDATE ON public.ai_campaign_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_hypothesis_threads BEFORE UPDATE ON public.hypothesis_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_campaign_drafts BEFORE UPDATE ON public.campaign_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_draft_items BEFORE UPDATE ON public.campaign_draft_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_launch_requests BEFORE UPDATE ON public.launch_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
