/**
 * Unified Platform Resources Hook
 * 
 * Single source of truth for all reusable connections/resources across the platform.
 * Aggregates: crm_bot_profiles, crm_external_connections, platform_connections,
 * platform_integrations, gos_integration_instances, clients (sheet URLs).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ResourceType = 'telegram_bot' | 'external_crm' | 'platform_ad' | 'platform_api' | 'sheet_url' | 'gos_integration';

export interface PlatformResource {
  id: string;
  type: ResourceType;
  provider: string;
  label: string;
  sourceTable: string;
  clientId: string | null;
  clientName?: string;
  isActive: boolean;
  isGlobal: boolean;
  hasSecret: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  status: 'healthy' | 'error' | 'inactive' | 'unconfigured';
  meta: Record<string, any>;
}

function resolveStatus(isActive: boolean, lastError: string | null, hasSecret: boolean): PlatformResource['status'] {
  if (!isActive) return 'inactive';
  if (!hasSecret) return 'unconfigured';
  if (lastError) return 'error';
  return 'healthy';
}

export function usePlatformResources(opts?: { clientId?: string; type?: ResourceType; activeOnly?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['platform-resources', opts?.clientId, opts?.type, opts?.activeOnly],
    queryFn: async (): Promise<PlatformResource[]> => {
      const resources: PlatformResource[] = [];
      const clientMap = new Map<string, string>();

      // Fetch clients for name resolution
      const { data: clients } = await supabase.from('clients').select('id, name');
      (clients || []).forEach(c => clientMap.set(c.id, c.name));

      // 1. CRM Bot Profiles → telegram_bot
      const { data: bots } = await supabase.from('crm_bot_profiles' as any).select('*');
      (bots || []).forEach((b: any) => {
        resources.push({
          id: b.id,
          type: 'telegram_bot',
          provider: 'Telegram',
          label: b.bot_name,
          sourceTable: 'crm_bot_profiles',
          clientId: b.client_id,
          clientName: b.client_id ? clientMap.get(b.client_id) : undefined,
          isActive: b.is_active,
          isGlobal: !b.client_id,
          hasSecret: !!b.bot_token_ref,
          lastSyncAt: null,
          lastError: null,
          status: resolveStatus(b.is_active, null, !!b.bot_token_ref),
          meta: { created_by: b.created_by },
        });
      });

      // 2. External CRM Connections
      const { data: crmConns } = await supabase.from('crm_external_connections' as any).select('*');
      (crmConns || []).forEach((c: any) => {
        resources.push({
          id: c.id,
          type: 'external_crm',
          provider: c.provider,
          label: c.label || c.provider,
          sourceTable: 'crm_external_connections',
          clientId: c.client_id,
          clientName: c.client_id ? clientMap.get(c.client_id) : undefined,
          isActive: c.is_active !== false,
          isGlobal: !c.client_id,
          hasSecret: !!c.api_key_ref,
          lastSyncAt: c.last_synced_at,
          lastError: c.last_sync_error,
          status: resolveStatus(c.is_active !== false, c.last_sync_error, !!c.api_key_ref),
          meta: { sync_interval: c.sync_interval_minutes, base_url: c.base_url },
        });
      });

      // 3. Platform Connections (Meta, Google, TikTok ad accounts)
      const { data: platConns } = await supabase.from('platform_connections').select('*');
      (platConns || []).forEach((p: any) => {
        resources.push({
          id: p.id,
          type: 'platform_ad',
          provider: p.platform,
          label: p.account_name || `${p.platform} connection`,
          sourceTable: 'platform_connections',
          clientId: p.client_id,
          clientName: p.client_id ? clientMap.get(p.client_id) : undefined,
          isActive: p.is_active,
          isGlobal: !p.client_id,
          hasSecret: !!p.token_reference,
          lastSyncAt: p.last_sync_at,
          lastError: p.sync_error,
          status: resolveStatus(p.is_active, p.sync_error, !!p.token_reference),
          meta: { platform: p.platform, sync_status: p.sync_status },
        });
      });

      // 4. Platform Integrations (API keys for Freepik, Meta Ads Management, etc.)
      const { data: platInts } = await supabase.from('platform_integrations' as any).select('*');
      (platInts || []).forEach((pi: any) => {
        resources.push({
          id: pi.id,
          type: 'platform_api',
          provider: pi.integration_type,
          label: pi.display_name || pi.integration_type,
          sourceTable: 'platform_integrations',
          clientId: null,
          isActive: pi.is_active,
          isGlobal: true,
          hasSecret: !!pi.secret_ref,
          lastSyncAt: null,
          lastError: null,
          status: resolveStatus(pi.is_active, null, !!pi.secret_ref),
          meta: { config: pi.config },
        });
      });

      // 5. Client Sheet URLs (normalized from clients table)
      (clients || []).forEach((c: any) => {
        const sheets = [
          { key: 'google_sheet_url', provider: 'Google Sheets' },
          { key: 'meta_sheet_url', provider: 'Meta Sheet' },
          { key: 'tiktok_sheet_url', provider: 'TikTok Sheet' },
        ];
        sheets.forEach(s => {
          if (c[s.key]) {
            resources.push({
              id: `sheet_${c.id}_${s.key}`,
              type: 'sheet_url',
              provider: s.provider,
              label: `${c.name} — ${s.provider}`,
              sourceTable: 'clients',
              clientId: c.id,
              clientName: c.name,
              isActive: true,
              isGlobal: false,
              hasSecret: false,
              lastSyncAt: null,
              lastError: null,
              status: 'healthy',
              meta: { url: c[s.key], field: s.key },
            });
          }
        });
      });

      // Apply filters
      let filtered = resources;
      if (opts?.clientId) {
        filtered = filtered.filter(r => r.isGlobal || r.clientId === opts.clientId);
      }
      if (opts?.type) {
        filtered = filtered.filter(r => r.type === opts.type);
      }
      if (opts?.activeOnly) {
        filtered = filtered.filter(r => r.isActive);
      }
      return filtered;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

/** Convenience hook: get Telegram bots accessible for a given client scope */
export function useTelegramBots(clientId?: string) {
  const { data: resources = [], ...rest } = usePlatformResources({ type: 'telegram_bot' });
  const bots = clientId
    ? resources.filter(r => r.isGlobal || r.clientId === clientId)
    : resources;
  return { data: bots, ...rest };
}

/** Convenience hook: get platform ad connections for a client */
export function usePlatformAdConnections(clientId?: string) {
  return usePlatformResources({ type: 'platform_ad', clientId });
}

/** Convenience hook: get sheet resources for a client */
export function useSheetResources(clientId?: string) {
  return usePlatformResources({ type: 'sheet_url', clientId });
}
