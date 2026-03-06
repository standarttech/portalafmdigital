
-- Add module access permissions
ALTER TABLE public.user_permissions 
  ADD COLUMN IF NOT EXISTS can_access_afm_internal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_access_adminscale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_access_crm boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_crm_integrations boolean NOT NULL DEFAULT false;

-- CRM bot profiles table
CREATE TABLE IF NOT EXISTS public.crm_bot_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  bot_name text NOT NULL DEFAULT '',
  bot_token_ref text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.crm_bot_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage bot profiles" ON public.crm_bot_profiles
  FOR ALL TO authenticated USING (is_agency_admin(auth.uid()));

CREATE POLICY "Agency members view bot profiles" ON public.crm_bot_profiles
  FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));

-- Internal agency workspace for CRM
INSERT INTO public.clients (id, name, category, status, currency, timezone, notes)
VALUES ('00000000-0000-0000-0000-000000000001', 'AFM Digital', 'agency', 'active', 'USD', 'Europe/Moscow', 'Internal agency workspace')
ON CONFLICT (id) DO NOTHING;
