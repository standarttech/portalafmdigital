
-- Add unique constraints for Meta sync upserts
CREATE UNIQUE INDEX IF NOT EXISTS campaigns_account_platform_id_uniq ON public.campaigns (ad_account_id, platform_campaign_id);
CREATE UNIQUE INDEX IF NOT EXISTS daily_metrics_campaign_date_uniq ON public.daily_metrics (campaign_id, date);
