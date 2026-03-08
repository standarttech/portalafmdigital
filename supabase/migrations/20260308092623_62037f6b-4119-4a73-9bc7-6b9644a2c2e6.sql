
DELETE FROM daily_metrics 
WHERE campaign_id IN (
  SELECT c.id FROM campaigns c
  WHERE c.platform_campaign_id LIKE 'sheets-%'
  AND c.client_id IN (
    SELECT DISTINCT aa.client_id FROM ad_accounts aa 
    WHERE aa.platform_account_id NOT LIKE 'sheets-%' 
    AND aa.is_active = true
  )
);

DELETE FROM campaigns 
WHERE platform_campaign_id LIKE 'sheets-%'
AND client_id IN (
  SELECT DISTINCT aa.client_id FROM ad_accounts aa 
  WHERE aa.platform_account_id NOT LIKE 'sheets-%' 
  AND aa.is_active = true
);
