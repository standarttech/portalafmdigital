
-- 1. Admin approval system for critical actions
CREATE TABLE public.admin_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL, -- 'delete_client', 'delete_user', 'change_role'
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  payload JSONB DEFAULT '{}',
  requested_by UUID NOT NULL,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.admin_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage approvals" ON public.admin_approvals
  FOR ALL USING (is_agency_admin(auth.uid()));

-- 2. Add platform-specific sheet URLs to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS meta_sheet_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_sheet_url TEXT;

-- 3. Trigger: auto-create client chat room when a client is created
CREATE OR REPLACE FUNCTION public.auto_create_client_chat_room()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  new_room_id UUID;
BEGIN
  -- Create a support chat room for the new client
  INSERT INTO public.chat_rooms (name, type, client_id, created_by)
  VALUES ('Support: ' || NEW.name, 'support', NEW.id, (SELECT user_id FROM public.agency_users WHERE agency_role = 'AgencyAdmin' LIMIT 1))
  RETURNING id INTO new_room_id;

  -- Add all admins as members
  FOR admin_record IN
    SELECT user_id FROM public.agency_users WHERE agency_role = 'AgencyAdmin'
  LOOP
    INSERT INTO public.chat_members (room_id, user_id, can_write)
    VALUES (new_room_id, admin_record.user_id, true);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_client_chat
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_client_chat_room();

-- 4. Trigger: notify admins when approval is requested
CREATE OR REPLACE FUNCTION public.notify_admins_approval_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE TRIGGER trg_notify_approval_request
  AFTER INSERT ON public.admin_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_approval_request();

-- 5. Enable realtime for admin_approvals
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_approvals;
