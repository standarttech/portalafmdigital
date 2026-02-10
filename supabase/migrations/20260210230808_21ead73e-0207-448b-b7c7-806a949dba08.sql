
-- Sanitize audit log function to strip sensitive fields
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  new_record jsonb;
  old_record jsonb;
BEGIN
  -- Sanitize NEW record
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    new_record := to_jsonb(NEW);
    -- Remove sensitive fields
    IF TG_TABLE_NAME = 'invitations' THEN
      new_record := new_record - 'token';
    END IF;
    IF TG_TABLE_NAME = 'platform_connections' THEN
      new_record := new_record - 'token_reference';
    END IF;
  END IF;

  -- Sanitize OLD record
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    old_record := to_jsonb(OLD);
    IF TG_TABLE_NAME = 'invitations' THEN
      old_record := old_record - 'token';
    END IF;
    IF TG_TABLE_NAME = 'platform_connections' THEN
      old_record := old_record - 'token_reference';
    END IF;
  END IF;

  INSERT INTO public.audit_log (action, entity_type, entity_id, user_id, details)
  VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    COALESCE(auth.uid()::text, 'system'),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'new', new_record,
      'old', old_record
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
