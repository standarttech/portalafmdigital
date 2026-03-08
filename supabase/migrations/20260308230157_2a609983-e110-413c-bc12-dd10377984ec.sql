-- Trigger: notify portal when campaign is launched (external_campaign_id set)
CREATE OR REPLACE FUNCTION public.notify_portal_campaign_launched()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Only fire when external_campaign_id transitions from NULL to a value
  IF OLD.external_campaign_id IS NULL AND NEW.external_campaign_id IS NOT NULL THEN
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

CREATE TRIGGER trg_portal_campaign_launched
AFTER UPDATE ON public.launch_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_portal_campaign_launched();

-- Trigger: notify portal when optimization action is executed
CREATE OR REPLACE FUNCTION public.notify_portal_optimization_executed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'executed' AND NEW.status = 'executed' THEN
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

CREATE TRIGGER trg_portal_optimization_executed
AFTER UPDATE ON public.optimization_actions
FOR EACH ROW EXECUTE FUNCTION public.notify_portal_optimization_executed();

-- Trigger: notify portal when new recommendation is created
CREATE OR REPLACE FUNCTION public.notify_portal_recommendation_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  safe_title text;
BEGIN
  -- Sanitize title for client consumption
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

CREATE TRIGGER trg_portal_recommendation_added
AFTER INSERT ON public.ai_recommendations
FOR EACH ROW EXECUTE FUNCTION public.notify_portal_recommendation_added();

-- Trigger: notify portal when invite is accepted (portal access updated)
CREATE OR REPLACE FUNCTION public.notify_portal_access_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'active' AND NEW.status = 'active' THEN
    INSERT INTO public.portal_notifications (client_id, type, title, message, link)
    VALUES (
      NEW.client_id,
      'portal_access_updated',
      'Portal access activated',
      'Welcome! Your portal access has been activated.',
      '/portal'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_portal_access_updated
AFTER UPDATE ON public.client_portal_users
FOR EACH ROW EXECUTE FUNCTION public.notify_portal_access_updated();