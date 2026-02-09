
-- Create audit logging trigger function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (action, entity_type, entity_id, user_id, details)
  VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    auth.uid(),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
      'old', CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN to_jsonb(OLD) ELSE NULL END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add audit triggers to key tables
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_agency_users AFTER INSERT OR UPDATE OR DELETE ON public.agency_users FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_campaigns AFTER INSERT OR UPDATE OR DELETE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_user_permissions AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_invitations AFTER INSERT OR UPDATE OR DELETE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_client_users AFTER INSERT OR UPDATE OR DELETE ON public.client_users FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_reports AFTER INSERT OR UPDATE OR DELETE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_daily_metrics AFTER INSERT OR UPDATE OR DELETE ON public.daily_metrics FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
