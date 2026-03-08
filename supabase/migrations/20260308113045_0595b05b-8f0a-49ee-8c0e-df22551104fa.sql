
-- Rewrite triggers to use hardcoded URL instead of current_setting (ALTER DATABASE not allowed)
CREATE OR REPLACE FUNCTION public.notify_admins_new_access_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $fn$
DECLARE
  admin_ids uuid[];
  payload jsonb;
  svc_key text;
BEGIN
  SELECT array_agg(user_id) INTO admin_ids
  FROM public.agency_users WHERE agency_role = 'AgencyAdmin';

  IF admin_ids IS NULL OR array_length(admin_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read service_role_key from vault
  SELECT decrypted_secret INTO svc_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF svc_key IS NULL THEN
    -- Fallback: insert directly
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT unnest(admin_ids), 'New Access Request',
      'New registration request from ' || NEW.full_name || ' (' || NEW.email || ')',
      'info', '/users';
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'user_ids', to_jsonb(admin_ids),
    'type', 'alert',
    'title', 'New Access Request',
    'message', 'New registration request from ' || NEW.full_name || ' (' || NEW.email || ')',
    'link', '/users'
  );

  PERFORM net.http_post(
    url := 'https://bhwvnmyvebgnxiisloqu.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || svc_key
    ),
    body := payload
  );

  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.notify_admins_approval_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $fn$
DECLARE
  admin_ids uuid[];
  requester_name text;
  payload jsonb;
  svc_key text;
BEGIN
  SELECT display_name INTO requester_name FROM public.agency_users WHERE user_id = NEW.requested_by;

  SELECT array_agg(user_id) INTO admin_ids
  FROM public.agency_users
  WHERE agency_role = 'AgencyAdmin' AND user_id != NEW.requested_by;

  IF admin_ids IS NULL OR array_length(admin_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO svc_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF svc_key IS NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT unnest(admin_ids), 'Approval Required',
      COALESCE(requester_name, 'Admin') || ' requests: ' || NEW.action_type || ' — ' || COALESCE(NEW.entity_name, NEW.entity_id),
      'warning', '/users';
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'user_ids', to_jsonb(admin_ids),
    'type', 'approval',
    'title', 'Approval Required',
    'message', COALESCE(requester_name, 'Admin') || ' requests: ' || NEW.action_type || ' — ' || COALESCE(NEW.entity_name, NEW.entity_id),
    'link', '/users'
  );

  PERFORM net.http_post(
    url := 'https://bhwvnmyvebgnxiisloqu.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || svc_key
    ),
    body := payload
  );

  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.notify_admins_support_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $fn$
DECLARE
  room_record RECORD;
  admin_ids uuid[];
  sender_role text;
  client_name text;
  payload jsonb;
  svc_key text;
BEGIN
  SELECT type, client_id INTO room_record
  FROM public.chat_rooms WHERE id = NEW.room_id;

  IF room_record.type != 'support' THEN
    RETURN NEW;
  END IF;

  SELECT agency_role INTO sender_role
  FROM public.agency_users WHERE user_id = NEW.user_id;

  IF sender_role IS DISTINCT FROM 'Client' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO client_name
  FROM public.clients WHERE id = room_record.client_id;

  SELECT array_agg(user_id) INTO admin_ids
  FROM public.agency_users WHERE agency_role = 'AgencyAdmin';

  IF admin_ids IS NULL OR array_length(admin_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO svc_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF svc_key IS NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT unnest(admin_ids), 'Support Message',
      'New support message from ' || COALESCE(client_name, 'Client') || ': ' || LEFT(NEW.content, 100),
      'warning', '/chat';
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'user_ids', to_jsonb(admin_ids),
    'type', 'chat',
    'title', 'Support Message',
    'message', 'New support message from ' || COALESCE(client_name, 'Client') || ': ' || LEFT(NEW.content, 100),
    'link', '/chat'
  );

  PERFORM net.http_post(
    url := 'https://bhwvnmyvebgnxiisloqu.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || svc_key
    ),
    body := payload
  );

  RETURN NEW;
END;
$fn$;
