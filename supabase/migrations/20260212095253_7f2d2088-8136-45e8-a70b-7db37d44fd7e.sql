
-- Trigger: notify all admins when a new access_request is created
CREATE OR REPLACE FUNCTION public.notify_admins_new_access_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN
    SELECT user_id FROM public.agency_users WHERE agency_role = 'AgencyAdmin'
  LOOP
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
$$;

CREATE TRIGGER on_access_request_insert
  AFTER INSERT ON public.access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_access_request();

-- Trigger: notify all admins when a client writes in a support chat
CREATE OR REPLACE FUNCTION public.notify_admins_support_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  room_record RECORD;
  admin_record RECORD;
  sender_role TEXT;
  client_name TEXT;
BEGIN
  -- Check if this is a support room
  SELECT type, client_id INTO room_record
  FROM public.chat_rooms WHERE id = NEW.room_id;

  IF room_record.type != 'support' THEN
    RETURN NEW;
  END IF;

  -- Check sender role - only notify if sender is a Client
  SELECT agency_role INTO sender_role
  FROM public.agency_users WHERE user_id = NEW.user_id;

  IF sender_role IS DISTINCT FROM 'Client' THEN
    RETURN NEW;
  END IF;

  -- Get client name
  SELECT name INTO client_name
  FROM public.clients WHERE id = room_record.client_id;

  -- Notify all admins
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
$$;

CREATE TRIGGER on_support_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_support_message();
