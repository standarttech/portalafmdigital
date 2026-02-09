
-- Drop existing triggers and recreate
DROP TRIGGER IF EXISTS audit_agency_users ON public.agency_users;
DROP TRIGGER IF EXISTS audit_clients ON public.clients;
DROP TRIGGER IF EXISTS audit_client_users ON public.client_users;
DROP TRIGGER IF EXISTS audit_user_permissions ON public.user_permissions;
DROP TRIGGER IF EXISTS audit_campaigns ON public.campaigns;
DROP TRIGGER IF EXISTS audit_platform_connections ON public.platform_connections;
DROP TRIGGER IF EXISTS audit_reports ON public.reports;
DROP TRIGGER IF EXISTS audit_invitations ON public.invitations;
DROP TRIGGER IF EXISTS audit_access_requests ON public.access_requests;

CREATE TRIGGER audit_agency_users AFTER INSERT OR UPDATE OR DELETE ON public.agency_users FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_client_users AFTER INSERT OR UPDATE OR DELETE ON public.client_users FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_user_permissions AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_campaigns AFTER INSERT OR UPDATE OR DELETE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_platform_connections AFTER INSERT OR UPDATE OR DELETE ON public.platform_connections FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_reports AFTER INSERT OR UPDATE OR DELETE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_invitations AFTER INSERT OR UPDATE OR DELETE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_access_requests AFTER INSERT OR UPDATE OR DELETE ON public.access_requests FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
