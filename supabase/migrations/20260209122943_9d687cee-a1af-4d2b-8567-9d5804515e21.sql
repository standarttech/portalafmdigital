
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean NOT NULL DEFAULT false;
