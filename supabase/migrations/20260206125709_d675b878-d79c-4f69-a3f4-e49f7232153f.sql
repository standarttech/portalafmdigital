
-- Enum types
CREATE TYPE public.agency_role AS ENUM ('AgencyAdmin', 'MediaBuyer');
CREATE TYPE public.client_role AS ENUM ('Client');
CREATE TYPE public.platform_type AS ENUM ('meta', 'google', 'tiktok');
CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'paused');
CREATE TYPE public.campaign_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.report_status AS ENUM ('draft', 'published');
CREATE TYPE public.sync_status AS ENUM ('idle', 'running', 'success', 'error');

-- Agency users (global roles - NOT tied to a client)
CREATE TABLE public.agency_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  agency_role agency_role NOT NULL DEFAULT 'MediaBuyer',
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User settings
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  language TEXT NOT NULL DEFAULT 'ru',
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status client_status NOT NULL DEFAULT 'active',
  timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
  currency TEXT NOT NULL DEFAULT 'USD',
  logo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client-user assignments (MediaBuyer & Client access)
CREATE TABLE public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MediaBuyer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- Granular permissions per user
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  can_add_clients BOOLEAN NOT NULL DEFAULT false,
  can_edit_clients BOOLEAN NOT NULL DEFAULT false,
  can_assign_clients_to_users BOOLEAN NOT NULL DEFAULT false,
  can_connect_integrations BOOLEAN NOT NULL DEFAULT false,
  can_run_manual_sync BOOLEAN NOT NULL DEFAULT false,
  can_edit_metrics_override BOOLEAN NOT NULL DEFAULT false,
  can_manage_tasks BOOLEAN NOT NULL DEFAULT false,
  can_publish_reports BOOLEAN NOT NULL DEFAULT false,
  can_view_audit_log BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform connections
CREATE TABLE public.platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  account_name TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status sync_status NOT NULL DEFAULT 'idle',
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, platform)
);

-- Ad accounts
CREATE TABLE public.ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform_account_id TEXT NOT NULL,
  account_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform_campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  status campaign_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily metrics
CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  link_clicks INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  checkouts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, date)
);

-- Metric overrides
CREATE TABLE public.metric_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  field_name TEXT NOT NULL,
  override_value NUMERIC(12,2) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client table presets (custom columns per client)
CREATE TABLE public.client_table_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  preset_name TEXT NOT NULL DEFAULT 'Default',
  columns JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task templates
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  checklist JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Annotations (chart annotations)
CREATE TABLE public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  status report_status NOT NULL DEFAULT 'draft',
  content JSONB,
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Raw API logs
CREATE TABLE public.raw_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  platform platform_type,
  endpoint TEXT,
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_daily_metrics_client_date ON public.daily_metrics(client_id, date);
CREATE INDEX idx_daily_metrics_campaign_date ON public.daily_metrics(campaign_id, date);
CREATE INDEX idx_campaigns_client ON public.campaigns(client_id);
CREATE INDEX idx_client_users_user ON public.client_users(user_id);
CREATE INDEX idx_client_users_client ON public.client_users(client_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);
CREATE INDEX idx_raw_api_logs_created ON public.raw_api_logs(created_at);
CREATE INDEX idx_tasks_client ON public.tasks(client_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_agency_users_updated_at BEFORE UPDATE ON public.agency_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_platform_connections_updated_at BEFORE UPDATE ON public.platform_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS POLICIES ============

-- Security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_agency_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_users
    WHERE user_id = _user_id AND agency_role = 'AgencyAdmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agency_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_users
    WHERE user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_client_access(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_agency_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.client_users
      WHERE user_id = _user_id AND client_id = _client_id
    );
$$;

CREATE OR REPLACE FUNCTION public.no_admin_exists()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.agency_users WHERE agency_role = 'AgencyAdmin'
  );
$$;

-- Enable RLS on all tables
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_table_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- agency_users policies
CREATE POLICY "Agency admins can do everything on agency_users"
  ON public.agency_users FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Users can read own agency_users row"
  ON public.agency_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "First user can insert as admin"
  ON public.agency_users FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.no_admin_exists());

-- user_settings policies
CREATE POLICY "Users manage own settings"
  ON public.user_settings FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- clients policies
CREATE POLICY "Agency admins full access to clients"
  ON public.clients FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users can view clients"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users
      WHERE client_users.client_id = clients.id AND client_users.user_id = auth.uid()
    )
  );

-- client_users policies
CREATE POLICY "Agency admins full access to client_users"
  ON public.client_users FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Users can view own client_users"
  ON public.client_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- user_permissions policies
CREATE POLICY "Agency admins manage permissions"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- platform_connections policies
CREATE POLICY "Admin full access connections"
  ON public.platform_connections FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users view connections"
  ON public.platform_connections FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- ad_accounts policies
CREATE POLICY "Admin full access ad_accounts"
  ON public.ad_accounts FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users view ad_accounts"
  ON public.ad_accounts FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- campaigns policies
CREATE POLICY "Admin full access campaigns"
  ON public.campaigns FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users view campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- daily_metrics policies
CREATE POLICY "Admin full access daily_metrics"
  ON public.daily_metrics FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users view daily_metrics"
  ON public.daily_metrics FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- metric_overrides policies
CREATE POLICY "Admin full access metric_overrides"
  ON public.metric_overrides FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users view metric_overrides"
  ON public.metric_overrides FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- client_table_presets policies
CREATE POLICY "Admin full access presets"
  ON public.client_table_presets FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users view presets"
  ON public.client_table_presets FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- tasks policies
CREATE POLICY "Admin full access tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users manage tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- task_templates policies (agency-wide)
CREATE POLICY "Agency members view templates"
  ON public.task_templates FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Admin manage templates"
  ON public.task_templates FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

-- annotations policies
CREATE POLICY "Admin full access annotations"
  ON public.annotations FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users manage annotations"
  ON public.annotations FOR ALL TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- reports policies
CREATE POLICY "Admin full access reports"
  ON public.reports FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Assigned users view reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- raw_api_logs policies (agency only, no client access)
CREATE POLICY "Admin only raw_api_logs"
  ON public.raw_api_logs FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));

-- audit_log policies (agency only, no client access)
CREATE POLICY "Admin only audit_log"
  ON public.audit_log FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid()));
