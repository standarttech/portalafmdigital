-- Add app.afmdigital.com to the allowed redirect URLs for auth
-- This is done via the auth config, not SQL migration
-- The URL whitelisting is handled in the Supabase project settings
SELECT 1; -- placeholder, actual config is set via dashboard