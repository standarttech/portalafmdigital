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

// Demo fallback data
const demoSyncHistory = [
  { id: '1', client: 'TechStart Inc.', platform: 'Meta', status: 'success', time: '2 hours ago', duration: '12s', records: 145 },
  { id: '2', client: 'TechStart Inc.', platform: 'Google', status: 'success', time: '2 hours ago', duration: '8s', records: 89 },
  { id: '3', client: 'FashionBrand Pro', platform: 'Meta', status: 'success', time: '1 hour ago', duration: '15s', records: 203 },
  { id: '4', client: 'FashionBrand Pro', platform: 'TikTok', status: 'error', time: '1 hour ago', duration: '3s', records: 0 },
  { id: '5', client: 'HealthPlus Medical', platform: 'Google', status: 'success', time: '3 hours ago', duration: '6s', records: 67 },
  { id: '6', client: 'AutoDeal Motors', platform: 'Meta', status: 'running', time: 'Now', duration: '—', records: 0 },
];

interface Connection {
  id: string;
  platform: string;
  account_name: string | null;
  sync_status: string;
  last_sync_at: string | null;
  sync_error: string | null;
  is_active: boolean;
  client_id: string;
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

function getTimeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return '<1h ago';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SyncMonitorPage() {
  const { t } = useLanguage();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  const fetchConnections = useCallback(async () => {
    const { data, error } = await supabase
      .from('platform_connections')
      .select('id, platform, account_name, sync_status, last_sync_at, sync_error, is_active, client_id')
      .order('last_sync_at', { ascending: false });
    
    if (error || !data || data.length === 0) {
      setUseDemo(true);
    } else {
      setConnections(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const successCount = useDemo
    ? demoSyncHistory.filter(s => s.status === 'success').length
    : connections.filter(c => c.sync_status === 'success').length;
  const errorCount = useDemo
    ? demoSyncHistory.filter(s => s.status === 'error').length
    : connections.filter(c => c.sync_status === 'error').length;
  const runningCount = useDemo
    ? demoSyncHistory.filter(s => s.status === 'running').length
    : connections.filter(c => c.sync_status === 'running').length;

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
            ) : useDemo ? (
              <div className="space-y-3">
                {demoSyncHistory.map((s) => {
                  const Icon = statusIcon[s.status] || Clock;
                  return (
                    <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                      <Icon className={cn('h-5 w-5 flex-shrink-0', statusStyle[s.status])} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{s.client}</p>
                        <p className="text-xs text-muted-foreground">{s.platform} • {s.time}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{s.duration}</p>
                        {s.records > 0 && <p>{s.records} records</p>}
                      </div>
                    </div>
                  );
                })}
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
                        <p className="font-medium text-foreground text-sm">{conn.account_name || conn.platform}</p>
                        <p className="text-xs text-muted-foreground capitalize">{conn.platform} • {getTimeAgo(conn.last_sync_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(
                          'text-xs',
                          conn.sync_status === 'success' && 'bg-success/15 text-success border-success/20',
                          conn.sync_status === 'error' && 'bg-destructive/15 text-destructive border-destructive/20',
                          conn.sync_status === 'running' && 'bg-primary/15 text-primary border-primary/20',
                          conn.sync_status === 'idle' && 'bg-muted text-muted-foreground',
                        )}>
                          {conn.sync_status}
                        </Badge>
                        {conn.sync_error && (
                          <span className="text-xs text-destructive max-w-[150px] truncate" title={conn.sync_error}>
                            {conn.sync_error}
                          </span>
                        )}
                      </div>
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
