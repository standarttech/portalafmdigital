
-- Add category column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

-- Add visible_columns to clients for admin-managed column visibility per client
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS visible_columns jsonb DEFAULT NULL;
