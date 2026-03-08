
-- Expand campaign_drafts with new columns
ALTER TABLE public.campaign_drafts
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_entity_id text,
  ADD COLUMN IF NOT EXISTS objective text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS campaign_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS budget_mode text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS total_budget numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bid_strategy text NOT NULL DEFAULT 'lowest_cost',
  ADD COLUMN IF NOT EXISTS buying_type text NOT NULL DEFAULT 'auction',
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'not_validated',
  ADD COLUMN IF NOT EXISTS validation_errors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preview_payload jsonb DEFAULT '{}'::jsonb;

-- Expand campaign_draft_items with new columns
ALTER TABLE public.campaign_draft_items
  ADD COLUMN IF NOT EXISTS parent_item_id uuid REFERENCES public.campaign_draft_items(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS validation_errors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Rename position to sort_order if both exist (keep sort_order)
-- We'll just use sort_order going forward, position stays for backward compat

-- Update source_type from existing drafts metadata
UPDATE public.campaign_drafts
SET source_type = CASE
  WHEN recommendation_id IS NOT NULL THEN 'recommendation'
  WHEN hypothesis_id IS NOT NULL THEN 'hypothesis'
  ELSE 'manual'
END
WHERE source_type = 'manual' AND (recommendation_id IS NOT NULL OR hypothesis_id IS NOT NULL);

-- Set source_entity_id from existing references
UPDATE public.campaign_drafts
SET source_entity_id = COALESCE(recommendation_id::text, hypothesis_id::text)
WHERE source_entity_id IS NULL AND (recommendation_id IS NOT NULL OR hypothesis_id IS NOT NULL);
