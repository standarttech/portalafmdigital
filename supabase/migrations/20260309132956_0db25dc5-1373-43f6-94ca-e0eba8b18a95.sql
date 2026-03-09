-- Allow users to complete onboarding/security-required actions on their own settings row
-- while still protecting privileged flags from arbitrary updates.
CREATE OR REPLACE FUNCTION public.protect_user_settings_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Non-admins cannot modify privileged flags freely
  IF NOT is_agency_admin(auth.uid()) THEN
    -- Never allow non-admins to toggle bypass flag
    NEW.bypass_dual_approval := OLD.bypass_dual_approval;

    -- Allow user to clear their own force_password_change (true -> false) after password update
    IF auth.uid() = OLD.user_id
       AND OLD.force_password_change = true
       AND NEW.force_password_change = false THEN
      NEW.temp_password_expires_at := NULL;
    ELSE
      NEW.force_password_change := OLD.force_password_change;
      NEW.temp_password_expires_at := OLD.temp_password_expires_at;
    END IF;

    -- Allow user to clear own needs_password_setup during onboarding (true -> false)
    IF NOT (
      auth.uid() = OLD.user_id
      AND OLD.needs_password_setup = true
      AND NEW.needs_password_setup = false
    ) THEN
      NEW.needs_password_setup := OLD.needs_password_setup;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;