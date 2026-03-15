/**
 * Unified Platform Resources Hook — Production-grade
 *
 * Canonical resource contracts for all reusable connections/resources.
 * Sources: crm_bot_profiles, crm_external_connections, platform_connections_safe,
 * platform_integrations, gos_integration_instances, clients (sheet URLs).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ResourceType =
  | 'telegram_bot'
  | 'external_crm'
  | 'platform_ad'
  | 'platform_api'
  | 'sheet_url'
  | 'gos_integration';

export type ResourceStatus = 'healthy' | 'error' | 'inactive' | 'unconfigured';

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
  status: ResourceStatus;
  meta: Record<string, unknown>;
  /** Path to manage this resource in its source module */
  managePath: string;
  /** Whether inline management is possible or must redirect to source */
  manageMode: 'source_module' | 'connections_center';
}

function resolveStatus(
  isActive: boolean,
  lastError: string | null,
  hasSecret: boolean,
): ResourceStatus {
  if (!isActive) return 'inactive';
  if (!hasSecret) return 'unconfigured';
  if (lastError) return 'error';
  return 'healthy';
}

/**
 * For platform_connections_safe: derive auth state honestly.
 * The safe view intentionally hides token_reference.
 * We infer "configured" from: is_active + sync_status !== 'not_configured'.
 */
function derivePlatformConnectionAuthState(
  isActive: boolean | null,
  syncStatus: string | null,
  syncError: string | null,
): { hasSecret: boolean; status: ResourceStatus } {
  const active = isActive ?? false;
  if (!active) return { hasSecret: false, status: 'inactive' };
  // sync_status 'idle'/'syncing'/'synced'/'error' implies token exists
  // sync_status null or 'not_configured' implies no auth
  const configured = !!syncStatus && syncStatus !== 'not_configured';
  if (!configured) return { hasSecret: false, status: 'unconfigured' };
  if (syncError) return { hasSecret: true, status: 'error' };
  return { hasSecret: true, status: 'healthy' };
}

export function usePlatformResources(opts?: {
  clientId?: string;
  type?: ResourceType;
  activeOnly?: boolean;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['platform-resources', opts?.clientId, opts?.type, opts?.activeOnly],
    queryFn: async (): Promise<PlatformResource[]> => {
      const resources: PlatformResource[] = [];
      const clientMap = new Map<string, string>();

      // ─── Fetch clients (name map + sheet URLs) ───
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, google_sheet_url, meta_sheet_url, tiktok_sheet_url');
      (clients || []).forEach((c) => clientMap.set(c.id, c.name));

      // ─── 1. Telegram Bots (crm_bot_profiles) ───
      const { data: bots } = await supabase
        .from('crm_bot_profiles')
        .select('id, bot_name, is_active, client_id, bot_token_ref, created_by');
      (bots || []).forEach((b) => {
        resources.push({
          id: b.id,
          type: 'telegram_bot',
          provider: 'Telegram',
          label: b.bot_name,
          sourceTable: 'crm_bot_profiles',
          clientId: b.client_id,
          clientName: clientMap.get(b.client_id),
          isActive: b.is_active,
          isGlobal: false, // bots always have a client_id per schema
          hasSecret: !!b.bot_token_ref,
          lastSyncAt: null,
          lastError: null,
          status: resolveStatus(b.is_active, null, !!b.bot_token_ref),
          meta: { created_by: b.created_by },
          managePath: '/crm/integrations',
          manageMode: 'source_module',
        });
      });

      // ─── 2. External CRM Connections ───
      const { data: crmConns } = await supabase
        .from('crm_external_connections')
        .select(
          'id, client_id, provider, label, api_key_ref, base_url, sync_interval_minutes, is_active, last_synced_at, last_sync_error',
        );
      (crmConns || []).forEach((c) => {
        const active = c.is_active !== false;
        resources.push({
          id: c.id,
          type: 'external_crm',
          provider: c.provider,
          label: c.label || c.provider,
          sourceTable: 'crm_external_connections',
          clientId: c.client_id,
          clientName: c.client_id ? clientMap.get(c.client_id) : undefined,
          isActive: active,
          isGlobal: !c.client_id,
          hasSecret: !!c.api_key_ref,
          lastSyncAt: c.last_synced_at,
          lastError: c.last_sync_error,
          status: resolveStatus(active, c.last_sync_error, !!c.api_key_ref),
          meta: { sync_interval: c.sync_interval_minutes, base_url: c.base_url },
          managePath: '/crm/integrations',
          manageMode: 'source_module',
        });
      });

      // ─── 3. Platform Ad Connections (safe view) ───
      const { data: platConns } = await supabase
        .from('platform_connections_safe')
        .select('*');
      (platConns || []).forEach((p) => {
        if (!p.id) return;
        const derived = derivePlatformConnectionAuthState(
          p.is_active,
          p.sync_status,
          p.sync_error,
        );
        resources.push({
          id: p.id,
          type: 'platform_ad',
          provider: p.platform || 'unknown',
          label: p.account_name || `${p.platform} connection`,
          sourceTable: 'platform_connections',
          clientId: p.client_id,
          clientName: p.client_id ? clientMap.get(p.client_id) : undefined,
          isActive: p.is_active ?? false,
          isGlobal: !p.client_id,
          hasSecret: derived.hasSecret,
          lastSyncAt: p.last_sync_at,
          lastError: p.sync_error,
          status: derived.status,
          meta: { platform: p.platform, sync_status: p.sync_status },
          managePath: p.client_id
            ? `/clients/${p.client_id}`
            : '/ai-ads/integrations',
          manageMode: 'source_module',
        });
      });

      // ─── 4. Platform API Integrations (Freepik, Meta Ads Management, etc.) ───
      const { data: platInts } = await supabase
        .from('platform_integrations')
        .select('id, integration_type, display_name, is_active, secret_ref, config');
      (platInts || []).forEach((pi) => {
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
          managePath: '/ai-ads/integrations',
          manageMode: 'source_module',
        });
      });

      // ─── 5. Client Sheet URLs (normalized from clients table) ───
      const sheetDefs = [
        { key: 'google_sheet_url' as const, provider: 'Google Sheets' },
        { key: 'meta_sheet_url' as const, provider: 'Meta Sheet' },
        { key: 'tiktok_sheet_url' as const, provider: 'TikTok Sheet' },
      ];
      (clients || []).forEach((c) => {
        sheetDefs.forEach((s) => {
          const url = c[s.key];
          if (url) {
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
              hasSecret: false, // sheet URLs don't need vault secrets
              lastSyncAt: null,
              lastError: null,
              status: 'healthy',
              meta: { url, field: s.key },
              managePath: `/clients/${c.id}`,
              manageMode: 'source_module',
            });
          }
        });
      });

      // ─── 6. Growth OS Integration Instances ───
      const { data: gosInstances } = await supabase
        .from('gos_integration_instances')
        .select(
          'id, client_id, integration_id, is_active, vault_secret_ref, last_sync_at, error_message, config',
        );
      const { data: gosIntegrations } = await supabase
        .from('gos_integrations')
        .select('id, name, provider');
      const gosDefMap = new Map<string, { name: string; provider: string }>();
      (gosIntegrations || []).forEach((g) =>
        gosDefMap.set(g.id, { name: g.name, provider: g.provider }),
      );

      (gosInstances || []).forEach((gi) => {
        const def = gosDefMap.get(gi.integration_id);
        resources.push({
          id: gi.id,
          type: 'gos_integration',
          provider: def?.provider || 'Unknown',
          label: def?.name || gi.integration_id,
          sourceTable: 'gos_integration_instances',
          clientId: gi.client_id,
          clientName: gi.client_id ? clientMap.get(gi.client_id) : undefined,
          isActive: gi.is_active,
          isGlobal: !gi.client_id,
          hasSecret: !!gi.vault_secret_ref,
          lastSyncAt: gi.last_sync_at,
          lastError: gi.error_message,
          status: resolveStatus(gi.is_active, gi.error_message, !!gi.vault_secret_ref),
          meta: { config: gi.config, integration_id: gi.integration_id },
          managePath: '/growth-os/integrations',
          manageMode: 'source_module',
        });
      });

      // ─── Apply filters ───
      let filtered = resources;
      if (opts?.clientId) {
        filtered = filtered.filter(
          (r) => r.isGlobal || r.clientId === opts.clientId,
        );
      }
      if (opts?.type) {
        filtered = filtered.filter((r) => r.type === opts.type);
      }
      if (opts?.activeOnly) {
        filtered = filtered.filter((r) => r.isActive);
      }
      return filtered;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Convenience hooks ───

/** Telegram bots accessible for a given client scope */
export function useTelegramBots(clientId?: string) {
  const { data: resources = [], ...rest } = usePlatformResources({
    type: 'telegram_bot',
  });
  const bots = clientId
    ? resources.filter((r) => r.isGlobal || r.clientId === clientId)
    : resources;
  return { data: bots, ...rest };
}

/** Platform ad connections for a client */
export function usePlatformAdConnections(clientId?: string) {
  return usePlatformResources({ type: 'platform_ad', clientId });
}

/** Sheet resources for a client */
export function useSheetResources(clientId?: string) {
  return usePlatformResources({ type: 'sheet_url', clientId });
}
