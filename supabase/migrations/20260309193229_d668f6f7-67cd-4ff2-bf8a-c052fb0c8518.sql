-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date_campaign ON public.daily_metrics (date, campaign_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_client_date ON public.daily_metrics (client_id, date);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_status ON public.campaigns (client_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_ad_account ON public.campaigns (ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_connection ON public.ad_accounts (connection_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_platform_active ON public.platform_connections (platform, is_active);
CREATE INDEX IF NOT EXISTS idx_ad_level_metrics_account_date ON public.ad_level_metrics (ad_account_id, date);
CREATE INDEX IF NOT EXISTS idx_ad_level_metrics_client_date ON public.ad_level_metrics (client_id, date);
CREATE INDEX IF NOT EXISTS idx_client_users_user ON public.client_users (user_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_user ON public.agency_users (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON public.ai_tasks (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_pipeline_client ON public.crm_leads (pipeline_id, client_id);
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings (key);