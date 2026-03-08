import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface Connection {
  id: string;
  platform: string;
  account_name: string | null;
  sync_status: string;
  last_sync_at: string | null;
  sync_error: string | null;
  is_active: boolean;
  client_id: string;
  client_name?: string;
}

const statusIcon: Record<string, any> = {
  success: CheckCircle2,
  error: AlertCircle,
  running: RefreshCw,
  idle: Clock,
};

const statusStyle: Record<string, string> = {
  success: 'text-success',
  error: 'text-destructive',
  running: 'text-primary animate-spin',
  idle: 'text-muted-foreground',
};

function formatSyncTime(iso: string | null, isRu: boolean): string {
  if (!iso) return isRu ? 'Не синхронизировано' : 'Never synced';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  
  const timeStr = d.toLocaleString(isRu ? 'ru-RU' : 'en-US', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  
  let relativeStr = '';
  if (mins < 1) relativeStr = isRu ? 'только что' : 'just now';
  else if (mins < 60) relativeStr = `${mins}${isRu ? ' мин назад' : 'm ago'}`;
  else {
    const hours = Math.floor(mins / 60);
    if (hours < 24) relativeStr = `${hours}${isRu ? ' ч назад' : 'h ago'}`;
    else relativeStr = `${Math.floor(hours / 24)}${isRu ? ' дн назад' : 'd ago'}`;
  }

  return `${timeStr} (${relativeStr})`;
}

export default function SyncMonitorPage() {
  const { t, language } = useLanguage();
  const isRu = language === 'ru';
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    // Fetch platform_connections (Google Sheets sync)
    const { data: pcData } = await supabase
      .from('platform_connections')
      .select('id, platform, account_name, sync_status, last_sync_at, sync_error, is_active, client_id, clients(name)')
      .order('last_sync_at', { ascending: false, nullsFirst: false });

    const fromPC = (pcData || []).map((d: any) => ({ ...d, client_name: d.clients?.name }));

    // Fetch ad_accounts (direct Meta API connections)
    const { data: aaData } = await supabase
      .from('ad_accounts')
      .select('id, platform_account_id, account_name, is_active, client_id, clients(name)')
      .order('client_id');

    const fromAA = (aaData || []).map((d: any) => ({
      id: d.id,
      platform: 'meta (API)',
      account_name: d.account_name || d.platform_account_id,
      sync_status: d.is_active ? 'success' : 'idle',
      last_sync_at: null,
      sync_error: null,
      is_active: d.is_active,
      client_id: d.client_id,
      client_name: d.clients?.name,
    }));

    setConnections([...fromPC, ...fromAA]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const successCount = connections.filter(c => c.sync_status === 'success').length;
  const errorCount = connections.filter(c => c.sync_status === 'error').length;
  const runningCount = connections.filter(c => c.sync_status === 'running').length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('sync.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('sync.subtitle')}</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-sm text-muted-foreground">{t('sync.successful')}</span></div>
          <p className="text-2xl font-bold text-foreground">{successCount}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-sm text-muted-foreground">{t('sync.errors')}</span></div>
          <p className="text-2xl font-bold text-foreground">{errorCount}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><RefreshCw className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">{t('sync.running')}</span></div>
          <p className="text-2xl font-bold text-foreground">{runningCount}</p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('sync.connections')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wifi className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">{t('sync.noConnections')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('sync.noConnectionsDesc')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((conn) => {
                  const Icon = statusIcon[conn.sync_status] || Clock;
                  return (
                    <div key={conn.id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                      <Icon className={cn('h-5 w-5 flex-shrink-0', statusStyle[conn.sync_status])} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{conn.client_name || conn.account_name || conn.platform}</p>
                        <p className="text-xs text-muted-foreground capitalize">{conn.platform}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isRu ? 'Синхронизация: ' : 'Last sync: '}
                          {formatSyncTime(conn.last_sync_at, isRu)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={cn(
                          'text-xs',
                          conn.sync_status === 'success' && 'bg-success/15 text-success border-success/20',
                          conn.sync_status === 'error' && 'bg-destructive/15 text-destructive border-destructive/20',
                          conn.sync_status === 'running' && 'bg-primary/15 text-primary border-primary/20',
                          conn.sync_status === 'idle' && 'bg-muted text-muted-foreground',
                        )}>
                          {conn.sync_status}
                        </Badge>
                      </div>
                      {conn.sync_error && (
                        <span className="text-xs text-destructive max-w-[200px] truncate" title={conn.sync_error}>
                          {conn.sync_error}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
