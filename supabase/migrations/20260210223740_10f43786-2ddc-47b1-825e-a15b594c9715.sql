
-- 1. Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Agency admins can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (is_agency_admin(auth.uid()));

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- 2. Client comments table
CREATE TABLE public.client_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view comments"
ON public.client_comments FOR SELECT
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency members can create comments"
ON public.client_comments FOR INSERT
WITH CHECK (has_client_access(auth.uid(), client_id) AND user_id = auth.uid());

CREATE POLICY "Users can update own comments"
ON public.client_comments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can delete any comment"
ON public.client_comments FOR DELETE
USING (is_agency_admin(auth.uid()));

CREATE POLICY "Users can delete own comments"
ON public.client_comments FOR DELETE
USING (user_id = auth.uid());

-- 3. Budget plans table
CREATE TABLE public.budget_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month date NOT NULL,
  planned_spend numeric NOT NULL DEFAULT 0,
  planned_leads integer NOT NULL DEFAULT 0,
  planned_cpl numeric,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, month)
);

ALTER TABLE public.budget_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view budget plans"
ON public.budget_plans FOR SELECT
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency admins can manage budget plans"
ON public.budget_plans FOR ALL
USING (is_agency_admin(auth.uid()));

CREATE POLICY "Media buyers can manage budget plans"
ON public.budget_plans FOR INSERT
WITH CHECK (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));

CREATE POLICY "Media buyers can update budget plans"
ON public.budget_plans FOR UPDATE
USING (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));

CREATE INDEX idx_budget_plans_client ON public.budget_plans(client_id, month);
