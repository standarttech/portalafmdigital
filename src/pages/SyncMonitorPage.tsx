import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Wifi, Database, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface ClientSync {
  clientId: string;
  clientName: string;
  platform: string;
  accountName: string | null;
  hasApiConnection: boolean;
  hasSheetsConnection: boolean;
  latestMetricDate: string | null;
  syncStatus: 'ok' | 'stale' | 'no_data';
  accountId: string;
}

function formatRelative(iso: string | null, isRu: boolean): string {
  if (!iso) return isRu ? 'Нет данных' : 'No data';
  const d = new Date(iso);
  const now = new Date();
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
  if (diffH < 1) return isRu ? 'менее часа назад' : 'less than 1h ago';
  if (diffH < 24) return `${diffH}${isRu ? ' ч назад' : 'h ago'}`;
  const days = Math.floor(diffH / 24);
  return `${days}${isRu ? ' дн назад' : 'd ago'}`;
}

export default function SyncMonitorPage() {
  const { t, language } = useLanguage();
  const isRu = language === 'ru';
  const [syncs, setSyncs] = useState<ClientSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    // Get all ad accounts with client info
    const { data: accounts } = await supabase
      .from('ad_accounts')
      .select('id, platform_account_id, account_name, is_active, client_id, clients(name)')
      .eq('is_active', true)
      .order('client_id');

    if (!accounts?.length) { setSyncs([]); setLoading(false); return; }

    // Get latest metric date per ad account
    const results: ClientSync[] = [];
    const clientGroups: Record<string, typeof accounts> = {};
    for (const a of accounts) {
      if (!clientGroups[a.client_id]) clientGroups[a.client_id] = [];
      clientGroups[a.client_id].push(a);
    }

    for (const [clientId, clientAccounts] of Object.entries(clientGroups)) {
      const apiAccounts = clientAccounts.filter(a => !a.platform_account_id.startsWith('sheets-'));
      const sheetsAccounts = clientAccounts.filter(a => a.platform_account_id.startsWith('sheets-'));

      for (const acc of apiAccounts) {
        // Get latest metric date
        const { data: latestMetric } = await supabase
          .from('daily_metrics')
          .select('date')
          .eq('client_id', clientId)
          .in('campaign_id', (await supabase.from('campaigns').select('id').eq('ad_account_id', acc.id)).data?.map(c => c.id) || [])
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const latestDate = latestMetric?.date || null;
        let syncStatus: 'ok' | 'stale' | 'no_data' = 'no_data';
        if (latestDate) {
          const daysDiff = Math.floor((Date.now() - new Date(latestDate).getTime()) / 86400000);
          syncStatus = daysDiff <= 2 ? 'ok' : 'stale';
        }

        results.push({
          clientId,
          clientName: (acc as any).clients?.name || clientId.slice(0, 8),
          platform: 'Meta API',
          accountName: acc.account_name || acc.platform_account_id,
          hasApiConnection: true,
          hasSheetsConnection: sheetsAccounts.length > 0,
          latestMetricDate: latestDate,
          syncStatus,
          accountId: acc.platform_account_id,
        });
      }

      // Only show sheets if no API accounts for this client
      if (apiAccounts.length === 0) {
        for (const acc of sheetsAccounts) {
          results.push({
            clientId,
            clientName: (acc as any).clients?.name || clientId.slice(0, 8),
            platform: 'Google Sheets',
            accountName: acc.account_name || 'Sheets Import',
            hasApiConnection: false,
            hasSheetsConnection: true,
            latestMetricDate: null,
            syncStatus: 'ok',
            accountId: acc.platform_account_id,
          });
        }
      }
    }

    setSyncs(results);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-meta-ads', { body: { action: 'sync' } });
      if (error) throw error;
      toast.success(isRu ? `Синхронизировано: ${data?.synced || 0} записей` : `Synced: ${data?.synced || 0} records`);
      if (data?.errors?.length) {
        toast.warning(isRu ? `Ошибки: ${data.errors.length}` : `Errors: ${data.errors.length}`);
      }
      fetchData();
    } catch (e: any) { toast.error(e.message); }
    finally { setSyncing(false); }
  };

  const okCount = syncs.filter(s => s.syncStatus === 'ok').length;
  const staleCount = syncs.filter(s => s.syncStatus === 'stale').length;
  const noDataCount = syncs.filter(s => s.syncStatus === 'no_data').length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isRu ? 'Мониторинг синхронизации' : 'Sync Monitor'}</h1>
          <p className="text-muted-foreground text-sm mt-1">{isRu ? 'Статус данных рекламных аккаунтов' : 'Ad account data freshness'}</p>
        </div>
        <Button onClick={triggerSync} disabled={syncing} size="sm" className="gap-2">
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          {isRu ? 'Синхронизировать' : 'Sync Now'}
        </Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div><p className="text-2xl font-bold text-foreground">{okCount}</p><p className="text-xs text-muted-foreground">{isRu ? 'Актуальные' : 'Up to date'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-warning" />
          <div><p className="text-2xl font-bold text-foreground">{staleCount}</p><p className="text-xs text-muted-foreground">{isRu ? 'Устаревшие' : 'Stale'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Database className="h-5 w-5 text-muted-foreground" />
          <div><p className="text-2xl font-bold text-foreground">{noDataCount}</p><p className="text-xs text-muted-foreground">{isRu ? 'Нет данных' : 'No data'}</p></div>
        </CardContent></Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : syncs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Wifi className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">{isRu ? 'Нет активных аккаунтов' : 'No active accounts'}</p>
                <p className="text-sm text-muted-foreground mt-1">{isRu ? 'Подключите рекламные аккаунты в настройках клиентов' : 'Connect ad accounts in client settings'}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {syncs.map((s, i) => (
                  <div key={`${s.clientId}-${s.accountId}`} className="flex items-center gap-4 p-4 hover:bg-accent/20 transition-colors">
                    <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0',
                      s.syncStatus === 'ok' && 'bg-success',
                      s.syncStatus === 'stale' && 'bg-warning',
                      s.syncStatus === 'no_data' && 'bg-muted-foreground',
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{s.clientName}</p>
                      <p className="text-xs text-muted-foreground">{s.platform} • {s.accountName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {isRu ? 'Данные: ' : 'Data: '}{s.latestMetricDate || (isRu ? '—' : '—')}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        {formatRelative(s.latestMetricDate, isRu)}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] flex-shrink-0',
                      s.syncStatus === 'ok' && 'bg-success/10 text-success border-success/20',
                      s.syncStatus === 'stale' && 'bg-warning/10 text-warning border-warning/20',
                      s.syncStatus === 'no_data' && 'bg-muted text-muted-foreground',
                    )}>
                      {s.syncStatus === 'ok' ? (isRu ? 'Актуально' : 'OK')
                        : s.syncStatus === 'stale' ? (isRu ? 'Устарело' : 'Stale')
                        : (isRu ? 'Нет данных' : 'No data')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
