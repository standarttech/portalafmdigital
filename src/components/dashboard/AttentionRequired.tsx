import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, RefreshCw, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AlertItem {
  id: string;
  type: 'no_leads' | 'high_cpl' | 'sync_delay';
  clientId?: string;
  message: string;
}

const typeConfig = {
  no_leads: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  high_cpl: { icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
  sync_delay: { icon: RefreshCw, color: 'text-info', bg: 'bg-info/10' },
};

export default function AttentionRequired() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    async function fetchAlerts() {
      const result: AlertItem[] = [];

      // Check sync errors
      const { data: syncErrors } = await supabase
        .from('platform_connections_safe')
        .select('id, sync_status, sync_error, account_name, client_id')
        .eq('sync_status', 'error');

      (syncErrors || []).forEach(s => {
        result.push({
          id: `sync-${s.id}`,
          type: 'sync_delay',
          clientId: s.client_id,
          message: `${s.account_name || 'Connection'}: ${s.sync_error || 'Sync error'}`,
        });
      });

      setAlerts(result);
    }
    fetchAlerts();
  }, []);

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-success/5 border border-success/20 text-success text-sm">
        <CheckCircle2 className="h-4 w-4" />
        {t('dashboard.noAlerts')}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        {t('dashboard.attentionRequired')}
      </h3>
      <div className="space-y-1">
        {alerts.map((alert) => {
          const config = typeConfig[alert.type];
          const Icon = config.icon;
          return (
            <button key={alert.id} onClick={() => alert.clientId ? navigate(`/clients/${alert.clientId}`) : navigate('/sync')}
              className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-sm">
              <div className={cn('h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0', config.bg)}>
                <Icon className={cn('h-3.5 w-3.5', config.color)} />
              </div>
              <span className="text-muted-foreground">{alert.message}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
