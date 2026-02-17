-- Add needs_password_setup flag to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS needs_password_setup boolean NOT NULL DEFAULT false;
