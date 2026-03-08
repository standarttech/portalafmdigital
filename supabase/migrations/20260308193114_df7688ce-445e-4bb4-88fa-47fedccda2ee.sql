-- Add analysis_type to ai_analysis_runs
ALTER TABLE ai_analysis_runs ADD COLUMN IF NOT EXISTS analysis_type text NOT NULL DEFAULT 'performance_summary';

-- Add hypothesis_id to campaign_drafts for hypothesis→draft conversion
ALTER TABLE campaign_drafts ADD COLUMN IF NOT EXISTS hypothesis_id uuid REFERENCES hypothesis_threads(id) ON DELETE SET NULL;

-- Add recommendation_id to hypothesis_threads for rec→hypothesis conversion  
ALTER TABLE hypothesis_threads ADD COLUMN IF NOT EXISTS recommendation_id uuid REFERENCES ai_recommendations(id) ON DELETE SET NULL;