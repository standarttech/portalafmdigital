
-- Drop FK constraint if exists
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;

-- Change entity_id and user_id to text
ALTER TABLE public.audit_log ALTER COLUMN entity_id TYPE text USING entity_id::text;
ALTER TABLE public.audit_log ALTER COLUMN user_id TYPE text USING user_id::text;

-- Re-create the function with proper casts
CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (action, entity_type, entity_id, user_id, details)
  VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    COALESCE(auth.uid()::text, 'system'),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
      'old', CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN to_jsonb(OLD) ELSE NULL END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;
