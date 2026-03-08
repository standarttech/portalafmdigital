import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, RefreshCw, CheckCircle2, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';

interface AlertItem {
  id: string;
  type: 'no_leads' | 'high_cpl' | 'sync_delay' | 'spend_spike';
  clientId?: string;
  message: string;
}

const typeConfig = {
  no_leads: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  high_cpl: { icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
  sync_delay: { icon: RefreshCw, color: 'text-info', bg: 'bg-info/10' },
  spend_spike: { icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-500/10' },
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

      // Anomaly detection: check last 3 days vs previous 7 days for active clients
      const today = format(new Date(), 'yyyy-MM-dd');
      const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');
      const tenDaysAgo = format(subDays(new Date(), 10), 'yyyy-MM-dd');

      const { data: activeClients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('status', 'active');

      if (activeClients && activeClients.length > 0) {
        const clientIds = activeClients.map(c => c.id);
        const nameMap: Record<string, string> = {};
        activeClients.forEach(c => { nameMap[c.id] = c.name; });

        const { data: recentMetrics } = await supabase
          .from('daily_metrics')
          .select('client_id, date, spend, leads')
          .in('client_id', clientIds)
          .gte('date', tenDaysAgo)
          .lte('date', today);

        if (recentMetrics) {
          // Group by client
          const byClient: Record<string, { recent: { spend: number; leads: number; days: number }; prev: { spend: number; leads: number; days: number } }> = {};
          
          recentMetrics.forEach(m => {
            if (!byClient[m.client_id]) {
              byClient[m.client_id] = {
                recent: { spend: 0, leads: 0, days: 0 },
                prev: { spend: 0, leads: 0, days: 0 },
              };
            }
            const bucket = m.date >= threeDaysAgo ? 'recent' : 'prev';
            byClient[m.client_id][bucket].spend += Number(m.spend);
            byClient[m.client_id][bucket].leads += m.leads;
            byClient[m.client_id][bucket].days += 1;
          });

          Object.entries(byClient).forEach(([clientId, data]) => {
            const name = nameMap[clientId] || 'Client';
            
            // Alert: active client spending but 0 leads in last 3 days
            if (data.recent.spend > 50 && data.recent.leads === 0 && data.recent.days >= 2) {
              result.push({
                id: `no-leads-${clientId}`,
                type: 'no_leads',
                clientId,
                message: `${name}: No leads in ${data.recent.days} days (spent $${data.recent.spend.toFixed(0)})`,
              });
            }

            // Alert: CPL spike > 50% compared to previous period
            if (data.prev.leads > 0 && data.recent.leads > 0 && data.prev.days >= 3) {
              const prevCpl = data.prev.spend / data.prev.leads;
              const recentCpl = data.recent.spend / data.recent.leads;
              if (prevCpl > 0 && recentCpl > prevCpl * 1.5) {
                result.push({
                  id: `high-cpl-${clientId}`,
                  type: 'high_cpl',
                  clientId,
                  message: `${name}: CPL spike $${recentCpl.toFixed(1)} vs $${prevCpl.toFixed(1)} avg (+${(((recentCpl - prevCpl) / prevCpl) * 100).toFixed(0)}%)`,
                });
              }
            }

            // Alert: spend spike > 50% 
            if (data.prev.days >= 3 && data.recent.days >= 2) {
              const prevDailySpend = data.prev.spend / data.prev.days;
              const recentDailySpend = data.recent.spend / data.recent.days;
              if (prevDailySpend > 10 && recentDailySpend > prevDailySpend * 1.5) {
                result.push({
                  id: `spend-spike-${clientId}`,
                  type: 'spend_spike',
                  clientId,
                  message: `${name}: Daily spend $${recentDailySpend.toFixed(0)}/day vs $${prevDailySpend.toFixed(0)}/day avg (+${(((recentDailySpend - prevDailySpend) / prevDailySpend) * 100).toFixed(0)}%)`,
                });
              }
            }
          });
        }
      }

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
