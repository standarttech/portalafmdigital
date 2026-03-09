import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  isAdmin: boolean;
}

interface SyncItem {
  platform: string;
  lastSync: string | null;
  status: 'ok' | 'delayed' | 'error' | 'idle';
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  ok: { icon: CheckCircle2, color: 'text-success', label: 'Synced' },
  delayed: { icon: AlertTriangle, color: 'text-warning', label: 'Delayed' },
  error: { icon: XCircle, color: 'text-destructive', label: 'Error' },
  idle: { icon: Clock, color: 'text-muted-foreground', label: 'Idle' },
};

function getTimeAgo(isoDate: string | null): string {
  if (!isoDate) return 'never';
  const now = new Date();
  const date = new Date(isoDate);
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return '<1h ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function mapSyncStatus(
  row: { sync_status: string | null; last_sync_at: string | null },
  platformKey: string,
): SyncItem['status'] {
  if (row.sync_status === 'error') return 'error';

  const okStatuses = new Set(['success', 'synced']);
  if (row.sync_status && okStatuses.has(row.sync_status)) {
    if (!row.last_sync_at) return 'ok';
    const hoursAgo = (Date.now() - new Date(row.last_sync_at).getTime()) / (1000 * 60 * 60);
    const maxAgeHours = platformKey === 'meta' ? 2 : 12;
    return hoursAgo > maxAgeHours ? 'delayed' : 'ok';
  }

  return 'idle';
}

export default function DataStatusPanel({ isAdmin }: Props) {
  const { t } = useLanguage();
  const [syncData, setSyncData] = useState<SyncItem[]>([]);

  const fetchSync = useCallback(async () => {
    const { data } = await supabase
      .from('platform_connections')
      .select('platform, sync_status, last_sync_at')
      .eq('is_active', true);

    if (!data || data.length === 0) {
      setSyncData([]);
      return;
    }

    // Group by platform, take latest sync per platform
    const byPlatform = new Map<string, { sync_status: string | null; last_sync_at: string | null }>();
    data.forEach(row => {
      const existing = byPlatform.get(row.platform);
      if (!existing || (row.last_sync_at && (!existing.last_sync_at || row.last_sync_at > existing.last_sync_at))) {
        byPlatform.set(row.platform, row);
      }
    });

    const items: SyncItem[] = [];
    byPlatform.forEach((row, platform) => {
      const label = platform === 'meta' ? 'Meta Ads' : platform === 'google' ? 'Google Ads' : 'TikTok Ads';
      items.push({ platform: label, lastSync: row.last_sync_at, status: mapSyncStatus(row) });
    });
    setSyncData(items);
  }, []);

  useEffect(() => { fetchSync(); }, [fetchSync]);

  if (syncData.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Clock className="h-3.5 w-3.5" />
        <span>{t('dashboard.lastUpdated')}: —</span>
      </div>
    );
  }

  if (!isAdmin) {
    const latestSync = syncData.reduce((best, s) => {
      if (!s.lastSync) return best;
      if (!best || s.lastSync > best) return s.lastSync;
      return best;
    }, '' as string);
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Clock className="h-3.5 w-3.5" />
        <span>{t('dashboard.lastUpdated')}: {latestSync ? getTimeAgo(latestSync) : '—'}</span>
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('dashboard.dataStatus')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="flex flex-wrap gap-4">
          {syncData.map((item) => {
            const config = statusConfig[item.status];
            const Icon = config.icon;
            return (
              <div key={item.platform} className="flex items-center gap-2 text-xs">
                <Icon className={cn('h-3.5 w-3.5', config.color)} />
                <span className="text-muted-foreground">{item.platform}:</span>
                <span className="text-foreground font-medium">{config.label}</span>
                <span className="text-muted-foreground/50">({getTimeAgo(item.lastSync)})</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}