ALTER TABLE public.crm_pipeline_stages 
ADD COLUMN IF NOT EXISTS is_qualified_stage boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_booked_stage boolean NOT NULL DEFAULT false;