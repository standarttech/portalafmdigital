-- 1. Portal notification preferences table
CREATE TABLE public.portal_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid NOT NULL REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
  campaign_launched boolean NOT NULL DEFAULT true,
  optimization_update boolean NOT NULL DEFAULT true,
  recommendation_added boolean NOT NULL DEFAULT true,
  report_available boolean NOT NULL DEFAULT true,
  file_shared boolean NOT NULL DEFAULT true,
  portal_access_updated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(portal_user_id)
);

ALTER TABLE public.portal_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Portal user can read/update own preferences
CREATE POLICY "portal_user_own_prefs"
ON public.portal_notification_preferences
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.id = portal_notification_preferences.portal_user_id
      AND cpu.user_id = auth.uid()
      AND cpu.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.id = portal_notification_preferences.portal_user_id
      AND cpu.user_id = auth.uid()
      AND cpu.status = 'active'
  )
);

-- Admin full access
CREATE POLICY "admin_portal_notif_prefs"
ON public.portal_notification_preferences
FOR ALL TO authenticated
USING (is_agency_member(auth.uid()))
WITH CHECK (is_agency_member(auth.uid()));

-- 2. Update recommendation trigger to include dedup (skip if same-type notification within 5 min for same client)
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
  -- Check if there's already a recommendation notification in last 5 minutes for this client
  SELECT COUNT(*) INTO recent_count
  FROM public.portal_notifications
  WHERE client_id = NEW.client_id
    AND type = 'recommendation_added'
    AND created_at > now() - interval '5 minutes';

  IF recent_count >= 3 THEN
    -- Update the most recent one to show batch count
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

-- 3. Update optimization trigger with dedup
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
    -- Dedup: check recent optimization notifications for same client
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

-- 4. Helper function to check notification preference
CREATE OR REPLACE FUNCTION public.portal_notification_enabled(_client_id uuid, _type text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT
      CASE _type
        WHEN 'campaign_launched' THEN p.campaign_launched
        WHEN 'optimization_update' THEN p.optimization_update
        WHEN 'recommendation_added' THEN p.recommendation_added
        WHEN 'report_available' THEN p.report_available
        WHEN 'file_shared' THEN p.file_shared
        WHEN 'portal_access_updated' THEN p.portal_access_updated
        ELSE true
      END
    FROM portal_notification_preferences p
    JOIN client_portal_users cpu ON cpu.id = p.portal_user_id
    WHERE cpu.client_id = _client_id AND cpu.status = 'active'
    LIMIT 1),
    true  -- default: enabled
  );
$$;