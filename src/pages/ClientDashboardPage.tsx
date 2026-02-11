import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import DashboardControls from '@/components/dashboard/DashboardControls';
import KpiSection from '@/components/dashboard/KpiSection';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import type { DateRange, Comparison, PlatformFilter, DashboardFilters } from '@/components/dashboard/dashboardData';
import type { KpiData, ChartDataPoint } from '@/hooks/useDashboardMetrics';
import { subDays, format, differenceInDays } from 'date-fns';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function getDateRange(range: DateRange, custom?: { from: Date; to: Date }) {
  const now = new Date();
  let from: Date;
  let to = now;
  switch (range) {
    case 'today': from = now; break;
    case '7d': from = subDays(now, 7); break;
    case '14d': from = subDays(now, 14); break;
    case '30d': from = subDays(now, 30); break;
    case '90d': from = subDays(now, 90); break;
    case 'custom':
      if (custom) { from = custom.from; to = custom.to; }
      else { from = subDays(now, 30); }
      break;
    default: from = subDays(now, 30);
  }
  const days = Math.max(differenceInDays(to, from), 1);
  return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd'), days };
}

export default function ClientDashboardPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [comparison, setComparison] = useState<Comparison>('previous_period');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => getDateRange(dateRange, customDateRange), [dateRange, customDateRange]);
  const prevRange = useMemo(() => {
    const days = range.days;
    const prevTo = subDays(new Date(range.from), 1);
    const prevFrom = subDays(prevTo, days);
    return { from: format(prevFrom, 'yyyy-MM-dd'), to: format(prevTo, 'yyyy-MM-dd') };
  }, [range]);

  // Fetch assigned client IDs
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user.id);
      const ids = data?.map(d => d.client_id) || [];
      setClientIds(ids);
      if (ids.length > 0) {
        const { data: cl } = await supabase.from('clients').select('name').eq('id', ids[0]).maybeSingle();
        if (cl) setClientName(cl.name);
      }
    })();
  }, [user]);

  // Fetch metrics scoped to client
  const fetchData = useCallback(async () => {
    if (clientIds.length === 0) { setLoading(false); return; }
    setLoading(true);
    try {
      let query = supabase
        .from('daily_metrics')
        .select('spend, leads, link_clicks, impressions, date')
        .in('client_id', clientIds)
        .gte('date', range.from)
        .lte('date', range.to);
      const { data: currentMetrics } = await query;

      let prevQuery = supabase
        .from('daily_metrics')
        .select('spend, leads, link_clicks, impressions')
        .in('client_id', clientIds)
        .gte('date', prevRange.from)
        .lte('date', prevRange.to);
      const { data: prevMetrics } = await prevQuery;

      const cur = (currentMetrics || []).reduce(
        (acc, r) => ({ spend: acc.spend + Number(r.spend), leads: acc.leads + r.leads, clicks: acc.clicks + r.link_clicks, impressions: acc.impressions + r.impressions }),
        { spend: 0, leads: 0, clicks: 0, impressions: 0 }
      );
      const prev = (prevMetrics || []).reduce(
        (acc, r) => ({ spend: acc.spend + Number(r.spend), leads: acc.leads + r.leads, clicks: acc.clicks + r.link_clicks, impressions: acc.impressions + r.impressions }),
        { spend: 0, leads: 0, clicks: 0, impressions: 0 }
      );

      setKpis({
        spend: cur.spend, leads: cur.leads, clicks: cur.clicks, impressions: cur.impressions,
        cpl: cur.leads > 0 ? cur.spend / cur.leads : 0,
        ctr: cur.impressions > 0 ? (cur.clicks / cur.impressions) * 100 : 0,
        activeClients: 0, activeCampaigns: 0,
        prevSpend: prev.spend, prevLeads: prev.leads, prevClicks: prev.clicks, prevImpressions: prev.impressions,
        prevCpl: prev.leads > 0 ? prev.spend / prev.leads : 0,
        prevCtr: prev.impressions > 0 ? (prev.clicks / prev.impressions) * 100 : 0,
      });

      // Chart data
      const byDate: Record<string, { spend: number; leads: number }> = {};
      (currentMetrics || []).forEach(r => {
        if (!byDate[r.date]) byDate[r.date] = { spend: 0, leads: 0 };
        byDate[r.date].spend += Number(r.spend);
        byDate[r.date].leads += r.leads;
      });
      setChartData(Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
        date: date.slice(5),
        spend: Math.round(v.spend),
        leads: v.leads,
        cpl: v.leads > 0 ? Math.round((v.spend / v.leads) * 100) / 100 : 0,
      })));
    } catch (err) {
      console.error('Client dashboard error:', err);
    }
    setLoading(false);
  }, [clientIds, range, prevRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <DashboardControls
        dateRange={dateRange} onDateRangeChange={setDateRange}
        comparison={comparison} onComparisonChange={setComparison}
        platform={platform} onPlatformChange={setPlatform}
        customDateRange={customDateRange} onCustomDateRangeChange={setCustomDateRange}
      />

      <motion.div variants={item}>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
            {clientName || t('dashboard.welcome')}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm flex items-center gap-1.5 mt-1">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{t('dashboard.syncStatus')}</span>
          </p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <KpiSection data={kpis} hideOperations />
      </motion.div>

      <motion.div variants={item}>
        <PerformanceChart chartData={chartData} />
      </motion.div>
    </motion.div>
  );
}
