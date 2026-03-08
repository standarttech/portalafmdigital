import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, RefreshCw, CheckCircle2, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { toClientCategory, type ClientCategory } from './categoryMetrics';

interface AlertItem {
  id: string;
  type: 'no_conversions' | 'high_cost' | 'sync_delay' | 'spend_spike';
  clientId?: string;
  message: string;
}

const typeConfig = {
  no_conversions: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  high_cost: { icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
  sync_delay: { icon: RefreshCw, color: 'text-info', bg: 'bg-info/10' },
  spend_spike: { icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-500/10' },
};

/** Categories where the primary conversion is purchases/revenue, not leads */
const ECOM_CATEGORIES: ClientCategory[] = ['ecom', 'info_product', 'saas'];

function isEcomLike(cat: ClientCategory) {
  return ECOM_CATEGORIES.includes(cat);
}

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

      // Filter out Google Sheets-originated errors (act_sheets-*)
      (syncErrors || []).filter(s => !s.sync_error?.includes('act_sheets-')).forEach(s => {
        result.push({
          id: `sync-${s.id}`,
          type: 'sync_delay',
          clientId: s.client_id,
          message: `${s.account_name || 'Connection'}: ${s.sync_error || 'Sync error'}`,
        });
      });

      // Anomaly detection per client category
      const today = format(new Date(), 'yyyy-MM-dd');
      const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');
      const tenDaysAgo = format(subDays(new Date(), 10), 'yyyy-MM-dd');

      const { data: activeClients } = await supabase
        .from('clients')
        .select('id, name, category')
        .eq('status', 'active');

      if (activeClients && activeClients.length > 0) {
        const clientIds = activeClients.map(c => c.id);
        const clientMap: Record<string, { name: string; category: ClientCategory }> = {};
        activeClients.forEach(c => {
          clientMap[c.id] = { name: c.name, category: toClientCategory(c.category) };
        });

        const { data: recentMetrics } = await supabase
          .from('daily_metrics')
          .select('client_id, date, spend, leads, purchases, revenue')
          .in('client_id', clientIds)
          .gte('date', tenDaysAgo)
          .lte('date', today);

        if (recentMetrics) {
          const byClient: Record<string, {
            recent: { spend: number; leads: number; purchases: number; revenue: number; days: number };
            prev: { spend: number; leads: number; purchases: number; revenue: number; days: number };
          }> = {};

          recentMetrics.forEach(m => {
            if (!byClient[m.client_id]) {
              byClient[m.client_id] = {
                recent: { spend: 0, leads: 0, purchases: 0, revenue: 0, days: 0 },
                prev: { spend: 0, leads: 0, purchases: 0, revenue: 0, days: 0 },
              };
            }
            const bucket = m.date >= threeDaysAgo ? 'recent' : 'prev';
            const b = byClient[m.client_id][bucket];
            b.spend += Number(m.spend);
            b.leads += m.leads;
            b.purchases += (m.purchases || 0);
            b.revenue += Number(m.revenue || 0);
            b.days += 1;
          });

          Object.entries(byClient).forEach(([clientId, data]) => {
            const info = clientMap[clientId];
            if (!info) return;
            const { name, category } = info;
            const ecom = isEcomLike(category);

            // Choose the right conversion metric based on category
            const recentConversions = ecom ? data.recent.purchases : data.recent.leads;
            const prevConversions = ecom ? data.prev.purchases : data.prev.leads;
            const conversionLabel = ecom ? 'purchases' : 'leads';

            // Alert: active client spending but 0 conversions in last 3 days
            if (data.recent.spend > 50 && recentConversions === 0 && data.recent.days >= 2) {
              result.push({
                id: `no-conv-${clientId}`,
                type: 'no_conversions',
                clientId,
                message: `${name}: No ${conversionLabel} in ${data.recent.days} days (spent $${data.recent.spend.toFixed(0)})`,
              });
            }

            // Alert: cost per conversion spike > 50%
            if (prevConversions > 0 && recentConversions > 0 && data.prev.days >= 3) {
              const prevCost = data.prev.spend / prevConversions;
              const recentCost = data.recent.spend / recentConversions;
              const costLabel = ecom ? 'CPS' : 'CPL';
              if (prevCost > 0 && recentCost > prevCost * 1.5) {
                result.push({
                  id: `high-cost-${clientId}`,
                  type: 'high_cost',
                  clientId,
                  message: `${name}: ${costLabel} spike $${recentCost.toFixed(1)} vs $${prevCost.toFixed(1)} avg (+${(((recentCost - prevCost) / prevCost) * 100).toFixed(0)}%)`,
                });
              }
            }

            // Alert: daily spend spike > 50%
            if (data.prev.days >= 3 && data.recent.days >= 2) {
              const prevDaily = data.prev.spend / data.prev.days;
              const recentDaily = data.recent.spend / data.recent.days;
              if (prevDaily > 10 && recentDaily > prevDaily * 1.5) {
                result.push({
                  id: `spend-spike-${clientId}`,
                  type: 'spend_spike',
                  clientId,
                  message: `${name}: Daily spend $${recentDaily.toFixed(0)}/day vs $${prevDaily.toFixed(0)}/day (+${(((recentDaily - prevDaily) / prevDaily) * 100).toFixed(0)}%)`,
                });
              }
            }

            // Ecom-specific: ROAS drop > 40%
            if (ecom && data.prev.days >= 3 && data.recent.days >= 2 && data.prev.spend > 0 && data.recent.spend > 0) {
              const prevRoas = data.prev.revenue / data.prev.spend;
              const recentRoas = data.recent.revenue / data.recent.spend;
              if (prevRoas > 0.5 && recentRoas < prevRoas * 0.6) {
                result.push({
                  id: `roas-drop-${clientId}`,
                  type: 'high_cost',
                  clientId,
                  message: `${name}: ROAS drop ${recentRoas.toFixed(2)}x vs ${prevRoas.toFixed(2)}x avg (-${(((prevRoas - recentRoas) / prevRoas) * 100).toFixed(0)}%)`,
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
