ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';

COMMENT ON COLUMN public.tasks.priority IS 'Task priority: urgent, high, medium, low';