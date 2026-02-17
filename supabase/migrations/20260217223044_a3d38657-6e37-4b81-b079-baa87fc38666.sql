CREATE OR REPLACE FUNCTION public.notify_admins_new_access_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN
    SELECT user_id FROM public.agency_users WHERE agency_role = 'AgencyAdmin'
  LOOP
    -- In-app notification only (http_post extension not available)
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      admin_record.user_id,
      'New Access Request',
      'New registration request from ' || NEW.full_name || ' (' || NEW.email || ')',
      'info',
      '/users'
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admins_approval_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  requester_name TEXT;
BEGIN
  SELECT display_name INTO requester_name FROM public.agency_users WHERE user_id = NEW.requested_by;
  
  FOR admin_record IN
    SELECT user_id FROM public.agency_users WHERE agency_role = 'AgencyAdmin' AND user_id != NEW.requested_by
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      admin_record.user_id,
      'Approval Required',
      COALESCE(requester_name, 'Admin') || ' requests: ' || NEW.action_type || ' — ' || COALESCE(NEW.entity_name, NEW.entity_id),
      'warning',
      '/users'
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admins_support_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  room_record RECORD;
  admin_record RECORD;
  sender_role TEXT;
  client_name TEXT;
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

  FOR admin_record IN
    SELECT user_id FROM public.agency_users WHERE agency_role = 'AgencyAdmin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      admin_record.user_id,
      'Support Message',
      'New support message from ' || COALESCE(client_name, 'Client') || ': ' || LEFT(NEW.content, 100),
      'warning',
      '/chat'
    );
  END LOOP;
  RETURN NEW;
END;
$function$;