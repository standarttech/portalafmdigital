
-- Content plans (AI-generated creative content plans for clients)
CREATE TABLE public.creative_content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Plan',
  description text DEFAULT '',
  period_start date,
  period_end date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  ai_prompt text DEFAULT '',
  ai_model text DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Individual items in a content plan
CREATE TABLE public.creative_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.creative_content_plans(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  format text NOT NULL DEFAULT 'image' CHECK (format IN ('image', 'video', 'carousel', 'story', 'text_copy', 'logo_product')),
  prompt text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'review', 'approved', 'rejected', 'published')),
  sort_order int NOT NULL DEFAULT 0,
  scheduled_date date,
  generated_url text,
  storage_path text,
  creative_asset_id uuid REFERENCES public.creative_assets(id),
  ai_notes text DEFAULT '',
  copy_headline text DEFAULT '',
  copy_body text DEFAULT '',
  copy_cta text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.creative_content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with client access can view plans"
  ON public.creative_content_plans FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users with client access can insert plans"
  ON public.creative_content_plans FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users with client access can update plans"
  ON public.creative_content_plans FOR UPDATE TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users with client access can delete plans"
  ON public.creative_content_plans FOR DELETE TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- Plan items inherit access from parent plan
CREATE POLICY "Users can view plan items via plan access"
  ON public.creative_plan_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.creative_content_plans p
    WHERE p.id = plan_id AND public.has_client_access(auth.uid(), p.client_id)
  ));

CREATE POLICY "Users can insert plan items via plan access"
  ON public.creative_plan_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.creative_content_plans p
    WHERE p.id = plan_id AND public.has_client_access(auth.uid(), p.client_id)
  ));

CREATE POLICY "Users can update plan items via plan access"
  ON public.creative_plan_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.creative_content_plans p
    WHERE p.id = plan_id AND public.has_client_access(auth.uid(), p.client_id)
  ));

CREATE POLICY "Users can delete plan items via plan access"
  ON public.creative_plan_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.creative_content_plans p
    WHERE p.id = plan_id AND public.has_client_access(auth.uid(), p.client_id)
  ));

-- Indexes
CREATE INDEX idx_creative_content_plans_client ON public.creative_content_plans(client_id);
CREATE INDEX idx_creative_plan_items_plan ON public.creative_plan_items(plan_id);
CREATE INDEX idx_creative_plan_items_status ON public.creative_plan_items(status);

-- Updated_at triggers
CREATE TRIGGER update_creative_content_plans_updated_at
  BEFORE UPDATE ON public.creative_content_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creative_plan_items_updated_at
  BEFORE UPDATE ON public.creative_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
