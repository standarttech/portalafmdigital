
-- Add force_password_change and temp_password_expires_at to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS temp_password_expires_at timestamp with time zone DEFAULT NULL;
