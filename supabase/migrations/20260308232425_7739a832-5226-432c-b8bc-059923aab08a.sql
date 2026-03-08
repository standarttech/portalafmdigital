
-- Fix triggers to respect notification preferences

CREATE OR REPLACE FUNCTION public.notify_portal_campaign_launched()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.external_campaign_id IS NULL AND NEW.external_campaign_id IS NOT NULL THEN
    -- Check if notifications are enabled for this type
    IF NOT portal_notification_enabled(NEW.client_id, 'campaign_launched') THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.portal_notifications (client_id, type, title, message, link)
    VALUES (
      NEW.client_id,
      'campaign_launched',
      'New campaign launched',
      'A new campaign has been launched on ' || COALESCE(NEW.platform, 'your ad platform') || '.',
      '/portal/campaigns'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_portal_recommendation_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  safe_title text;
  recent_count int;
BEGIN
  -- Check preferences
  IF NOT portal_notification_enabled(NEW.client_id, 'recommendation_added') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.portal_notifications
  WHERE client_id = NEW.client_id
    AND type = 'recommendation_added'
    AND created_at > now() - interval '5 minutes';

  IF recent_count >= 3 THEN
    UPDATE public.portal_notifications
    SET message = (recent_count + 1) || ' new insights are available for review.',
        title = 'New insights available',
        is_read = false
    WHERE id = (
      SELECT id FROM public.portal_notifications
      WHERE client_id = NEW.client_id AND type = 'recommendation_added'
      ORDER BY created_at DESC LIMIT 1
    );
    RETURN NEW;
  END IF;

  safe_title := COALESCE(NEW.title, 'New insight');
  safe_title := regexp_replace(safe_title, 'page_id|ad_account_id|adset_id|campaign_id', 'configuration', 'gi');
  safe_title := regexp_replace(safe_title, 'payload|config field', 'setting', 'gi');

  INSERT INTO public.portal_notifications (client_id, type, title, message, link)
  VALUES (
    NEW.client_id,
    'recommendation_added',
    'New insight available',
    safe_title,
    '/portal/recommendations'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_portal_optimization_executed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count int;
BEGIN
  IF OLD.status IS DISTINCT FROM 'executed' AND NEW.status = 'executed' THEN
    -- Check preferences
    IF NOT portal_notification_enabled(NEW.client_id, 'optimization_update') THEN
      RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO recent_count
    FROM public.portal_notifications
    WHERE client_id = NEW.client_id
      AND type = 'optimization_update'
      AND created_at > now() - interval '5 minutes';

    IF recent_count >= 2 THEN
      UPDATE public.portal_notifications
      SET message = (recent_count + 1) || ' optimization actions have been completed for your campaigns.',
          is_read = false
      WHERE id = (
        SELECT id FROM public.portal_notifications
        WHERE client_id = NEW.client_id AND type = 'optimization_update'
        ORDER BY created_at DESC LIMIT 1
      );
      RETURN NEW;
    END IF;

    INSERT INTO public.portal_notifications (client_id, type, title, message, link)
    VALUES (
      NEW.client_id,
      'optimization_update',
      'Optimization completed',
      'An optimization action (' || COALESCE(
        REPLACE(REPLACE(NEW.action_type, '_', ' '), 'update ', 'adjust '),
        'adjustment'
      ) || ') has been completed for your campaigns.',
      '/portal/campaigns'
    );
  END IF;
  RETURN NEW;
END;
$$;
