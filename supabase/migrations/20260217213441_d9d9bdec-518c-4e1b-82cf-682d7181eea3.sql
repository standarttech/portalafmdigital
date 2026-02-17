-- Add bypass_dual_approval flag to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS bypass_dual_approval boolean NOT NULL DEFAULT false;

-- Grant Danil Yussupov bypass rights immediately
UPDATE public.user_settings 
SET bypass_dual_approval = true 
WHERE user_id = 'a32bf186-248d-4b10-8468-f8713ccafa12';