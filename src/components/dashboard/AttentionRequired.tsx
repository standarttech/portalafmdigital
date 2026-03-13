import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, TrendingUp, RefreshCw, CheckCircle2, TrendingDown, ChevronDown, Sparkles, ArrowDownRight, ArrowUpRight, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAllAfmCampaignIds } from '@/lib/afmCampaignFilter';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { toClientCategory, type ClientCategory } from './categoryMetrics';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface AlertItem {
  id: string;
  type: 'no_conversions' | 'high_cost' | 'sync_delay' | 'spend_spike' | 'cost_drop' | 'conv_boost' | 'roas_up' | 'spend_efficient';
  clientId?: string;
  message: string;
  positive?: boolean;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  no_conversions: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  high_cost: { icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
  sync_delay: { icon: RefreshCw, color: 'text-info', bg: 'bg-info/10' },
  spend_spike: { icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  cost_drop: { icon: ArrowDownRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  conv_boost: { icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  roas_up: { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  spend_efficient: { icon: TrendingDown, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const ECOM_CATEGORIES: ClientCategory[] = ['ecom', 'info_product', 'saas'];
function isEcomLike(cat: ClientCategory) { return ECOM_CATEGORIES.includes(cat); }

async function fetchAlerts(): Promise<{ alerts: AlertItem[]; wins: AlertItem[] }> {
  const negatives: AlertItem[] = [];
  const positives: AlertItem[] = [];

  const { data: syncErrors } = await supabase
    .from('platform_connections_safe')
    .select('id, sync_status, sync_error, account_name, client_id')
    .eq('sync_status', 'error');

  (syncErrors || []).filter(s => {
    const err = (s.sync_error || '').toLowerCase();
    // Filter out noise: sheets placeholders, token refresh issues, rate limits, JSON parse errors
    if (err.includes('act_sheets-')) return false;
    if (err.includes('token') && err.includes('expired')) return false;
    if (err.includes('rate limit')) return false;
    if (err.includes('(#17)')) return false;
    if (err.includes('validating') && err.includes('access')) return false;
    if (err.includes('unexpected end of json')) return false;
    if (err.includes('json input')) return false;
    if (err.includes('json.parse')) return false;
    if (err.includes('invalid json')) return false;
    if (err.includes('oauth')) return false;
    if (err.includes('session') && err.includes('expired')) return false;
    if (err.includes('error validating')) return false;
    if (err.includes('temporarily unavailable')) return false;
    return true;
  }).forEach(s => {
    negatives.push({
      id: `sync-${s.id}`, type: 'sync_delay', clientId: s.client_id,
      message: `${s.account_name || 'Connection'}: ${s.sync_error || 'Sync error'}`,
    });
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');
  const tenDaysAgo = format(subDays(new Date(), 10), 'yyyy-MM-dd');

  const { data: activeClients } = await supabase
    .from('clients').select('id, name, category').eq('status', 'active');

  if (activeClients && activeClients.length > 0) {
    const clientIds = activeClients.map(c => c.id);
    const clientMap: Record<string, { name: string; category: ClientCategory }> = {};
    activeClients.forEach(c => { clientMap[c.id] = { name: c.name, category: toClientCategory(c.category) }; });

    const afmIds = await getAllAfmCampaignIds(clientIds);
    const metricsQuery = afmIds.length > 0
      ? supabase
          .from('daily_metrics')
          .select('client_id, date, spend, leads, purchases, revenue')
          .in('campaign_id', afmIds)
          .gte('date', tenDaysAgo).lte('date', today)
      : null;

    const recentMetrics = metricsQuery ? (await metricsQuery).data : [];

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
        b.spend += Number(m.spend); b.leads += m.leads;
        b.purchases += (m.purchases || 0); b.revenue += Number(m.revenue || 0);
        b.days += 1;
      });

      Object.entries(byClient).forEach(([clientId, data]) => {
        const info = clientMap[clientId];
        if (!info) return;
        const { name, category } = info;
        const ecom = isEcomLike(category);
        const recentConv = ecom ? data.recent.purchases : data.recent.leads;
        const prevConv = ecom ? data.prev.purchases : data.prev.leads;
        const convLabel = ecom ? 'purchases' : 'leads';

        if (data.recent.spend > 50 && recentConv === 0 && data.recent.days >= 2) {
          negatives.push({ id: `no-conv-${clientId}`, type: 'no_conversions', clientId,
            message: `${name}: No ${convLabel} in ${data.recent.days} days (spent $${data.recent.spend.toFixed(0)})`,
          });
        }

        // Skip clients with zero recent spend (ads turned off) — not a real signal
        const hasRecentSpend = data.recent.spend > 5;

        if (prevConv > 0 && recentConv > 0 && data.prev.days >= 3 && hasRecentSpend) {
          const prevCost = data.prev.spend / prevConv;
          const recentCost = data.recent.spend / recentConv;
          const costLabel = ecom ? 'CPS' : 'CPL';
          if (prevCost > 0 && recentCost > prevCost * 1.5) {
            negatives.push({ id: `high-cost-${clientId}`, type: 'high_cost', clientId,
              message: `${name}: ${costLabel} spike $${recentCost.toFixed(1)} vs $${prevCost.toFixed(1)} avg (+${(((recentCost - prevCost) / prevCost) * 100).toFixed(0)}%)`,
            });
          }
          if (prevCost > 0 && recentCost < prevCost * 0.75) {
            positives.push({ id: `cost-drop-${clientId}`, type: 'cost_drop', clientId, positive: true,
              message: `${name}: ${costLabel} dropped to $${recentCost.toFixed(1)} from $${prevCost.toFixed(1)} (−${(((prevCost - recentCost) / prevCost) * 100).toFixed(0)}%)`,
            });
          }
        }

        if (data.prev.days >= 3 && data.recent.days >= 2 && hasRecentSpend) {
          const prevDaily = data.prev.spend / data.prev.days;
          const recentDaily = data.recent.spend / data.recent.days;
          if (prevDaily > 10 && recentDaily > prevDaily * 1.5) {
            negatives.push({ id: `spend-spike-${clientId}`, type: 'spend_spike', clientId,
              message: `${name}: Daily spend $${recentDaily.toFixed(0)}/day vs $${prevDaily.toFixed(0)}/day (+${(((recentDaily - prevDaily) / prevDaily) * 100).toFixed(0)}%)`,
            });
          }
          if (prevDaily > 10 && recentDaily < prevDaily * 0.75 && recentConv >= prevConv * (data.recent.days / data.prev.days) * 0.9) {
            positives.push({ id: `spend-eff-${clientId}`, type: 'spend_efficient', clientId, positive: true,
              message: `${name}: Spend down to $${recentDaily.toFixed(0)}/day from $${prevDaily.toFixed(0)}/day with stable ${convLabel}`,
            });
          }
        }

        if (data.prev.days >= 3 && data.recent.days >= 2 && prevConv > 0) {
          const prevDailyConv = prevConv / data.prev.days;
          const recentDailyConv = recentConv / data.recent.days;
          if (prevDailyConv > 0 && recentDailyConv > prevDailyConv * 1.3) {
            positives.push({ id: `conv-boost-${clientId}`, type: 'conv_boost', clientId, positive: true,
              message: `${name}: ${convLabel} up ${recentDailyConv.toFixed(1)}/day vs ${prevDailyConv.toFixed(1)}/day (+${(((recentDailyConv - prevDailyConv) / prevDailyConv) * 100).toFixed(0)}%)`,
            });
          }
        }

        if (ecom && data.prev.days >= 3 && data.recent.days >= 2 && data.prev.spend > 0 && data.recent.spend > 0) {
          const prevRoas = data.prev.revenue / data.prev.spend;
          const recentRoas = data.recent.revenue / data.recent.spend;
          if (prevRoas > 0.5 && recentRoas < prevRoas * 0.6) {
            negatives.push({ id: `roas-drop-${clientId}`, type: 'high_cost', clientId,
              message: `${name}: ROAS drop ${recentRoas.toFixed(2)}x vs ${prevRoas.toFixed(2)}x avg (−${(((prevRoas - recentRoas) / prevRoas) * 100).toFixed(0)}%)`,
            });
          }
          if (prevRoas > 0.3 && recentRoas > prevRoas * 1.3) {
            positives.push({ id: `roas-up-${clientId}`, type: 'roas_up', clientId, positive: true,
              message: `${name}: ROAS up ${recentRoas.toFixed(2)}x from ${prevRoas.toFixed(2)}x (+${(((recentRoas - prevRoas) / prevRoas) * 100).toFixed(0)}%)`,
            });
          }
        }
      });
    }
  }

  return { alerts: negatives, wins: positives };
}

export default function AttentionRequired() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const { data } = useQuery({
    queryKey: ['dashboard-attention-alerts'],
    queryFn: fetchAlerts,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const alerts = data?.alerts ?? [];
  const wins = data?.wins ?? [];
  const totalCount = alerts.length + wins.length;

  if (totalCount === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-success/5 border border-success/20 text-success text-sm">
        <CheckCircle2 className="h-4 w-4" />
        {t('dashboard.noAlerts')}
      </div>
    );
  }

  const renderItem = (item: AlertItem) => {
    const config = typeConfig[item.type];
    const Icon = config.icon;
    return (
      <button key={item.id} onClick={() => item.clientId ? navigate(`/clients/${item.clientId}`) : navigate('/sync')}
        className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-sm">
        <div className={cn('h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0', config.bg)}>
          <Icon className={cn('h-3.5 w-3.5', config.color)} />
        </div>
        <span className="text-muted-foreground">{item.message}</span>
      </button>
    );
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <button className="w-full rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/30 transition-colors px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {alerts.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="font-medium text-destructive">{alerts.length}</span>
                <span className="text-muted-foreground text-xs">{t('dashboard.alertsCount')}</span>
              </span>
            )}
            {alerts.length > 0 && wins.length > 0 && (
              <span className="text-border">|</span>
            )}
            {wins.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="font-medium text-emerald-400">{wins.length}</span>
                <span className="text-muted-foreground text-xs">{t('dashboard.winsCount')}</span>
              </span>
            )}
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2">
          {alerts.length > 0 && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-2 px-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('dashboard.attentionRequired')}
              </h4>
              <div className="space-y-0.5">
                {alerts.map(renderItem)}
              </div>
            </div>
          )}
          {wins.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2 px-1">
                <Sparkles className="h-3.5 w-3.5" />
                {t('dashboard.positiveSignals')}
              </h4>
              <div className="space-y-0.5">
                {wins.map(renderItem)}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
