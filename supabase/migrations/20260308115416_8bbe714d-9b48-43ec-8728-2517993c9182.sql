
CREATE TABLE public.user_campaign_column_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  columns JSONB NOT NULL DEFAULT '["name","spend","impressions","clicks","cpc","ctr","leads","cpl","purchases","revenue"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_campaign_column_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own presets"
ON public.user_campaign_column_presets
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
