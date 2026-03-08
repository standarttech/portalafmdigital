import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GosMetrics {
  publishedLandings: number;
  publishedForms: number;
  totalSubmissions: number;
  submissions7d: number;
  submissions30d: number;
  activeOnboarding: number;
  completedOnboarding: number;
  onboardingCompletionRate: number;
  activeIntegrations: number;
  integrationErrors: number;
  activeRules: number;
  routingLogs7d: number;
  landingViews7d: number;
  formViews7d: number;
  formConversionRate: number;
  recentSubmissions: any[];
  recentRoutingLogs: any[];
  onboardingSessions: any[];
  integrationInstances: any[];
}

export function useGosMetrics() {
  return useQuery<GosMetrics>({
    queryKey: ['gos-metrics'],
    queryFn: async () => {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        landingsRes, formsRes, subsAllRes, subs7dRes, subs30dRes,
        onbActiveRes, onbCompletedRes, intActiveRes, intErrorRes,
        rulesActiveRes, logs7dRes, recentSubsRes, recentLogsRes,
        onbSessionsRes, intInstancesRes,
        landingViews7dRes, formViews7dRes, formSubmitSuccess7dRes,
      ] = await Promise.all([
        supabase.from('gos_landing_templates').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('gos_forms').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('gos_form_submissions').select('id', { count: 'exact', head: true }),
        supabase.from('gos_form_submissions').select('id', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('gos_form_submissions').select('id', { count: 'exact', head: true }).gte('created_at', d30),
        supabase.from('gos_onboarding_sessions').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('gos_onboarding_sessions').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('gos_integration_instances').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('gos_integration_instances').select('id', { count: 'exact', head: true }).not('error_message', 'is', null),
        supabase.from('gos_routing_rules').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('gos_routing_log').select('id', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('gos_form_submissions').select('id, form_id, data, source, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('gos_routing_log').select('id, lead_source, routed_to, action_taken, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('gos_onboarding_sessions').select('id, status, current_step, created_at, updated_at, clients(name), gos_onboarding_flows(name, steps)').order('updated_at', { ascending: false }).limit(5),
        supabase.from('gos_integration_instances').select('id, is_active, error_message, last_sync_at, created_at, gos_integrations(name, provider)').order('created_at', { ascending: false }).limit(5),
        // Analytics
        supabase.from('gos_analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'landing_view').gte('created_at', d7),
        supabase.from('gos_analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'form_view').gte('created_at', d7),
        supabase.from('gos_analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'form_submit_success').gte('created_at', d7),
      ]);

      const totalOnb = (onbActiveRes.count || 0) + (onbCompletedRes.count || 0);
      const completionRate = totalOnb > 0 ? Math.round(((onbCompletedRes.count || 0) / totalOnb) * 100) : 0;
      const fViews = formViews7dRes.count || 0;
      const fSubmits = formSubmitSuccess7dRes.count || 0;
      const convRate = fViews > 0 ? Math.round((fSubmits / fViews) * 100) : 0;

      return {
        publishedLandings: landingsRes.count || 0,
        publishedForms: formsRes.count || 0,
        totalSubmissions: subsAllRes.count || 0,
        submissions7d: subs7dRes.count || 0,
        submissions30d: subs30dRes.count || 0,
        activeOnboarding: onbActiveRes.count || 0,
        completedOnboarding: onbCompletedRes.count || 0,
        onboardingCompletionRate: completionRate,
        activeIntegrations: intActiveRes.count || 0,
        integrationErrors: intErrorRes.count || 0,
        activeRules: rulesActiveRes.count || 0,
        routingLogs7d: logs7dRes.count || 0,
        landingViews7d: landingViews7dRes.count || 0,
        formViews7d: fViews,
        formConversionRate: convRate,
        recentSubmissions: recentSubsRes.data || [],
        recentRoutingLogs: recentLogsRes.data || [],
        onboardingSessions: onbSessionsRes.data || [],
        integrationInstances: intInstancesRes.data || [],
      };
    },
    staleTime: 60_000,
  });
}
