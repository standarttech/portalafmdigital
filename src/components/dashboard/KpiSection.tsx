import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { DollarSign, Eye, MousePointerClick, Building2 } from 'lucide-react';
import type { KpiData } from '@/hooks/useDashboardMetrics';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

interface KpiCard {
  label: string;
  displayValue: string;
  icon: LucideIcon;
  change: string;
  positive: boolean;
  showChange?: boolean;
}

interface Props {
  data: KpiData | null;
  hideOperations?: boolean;
  showComparison?: boolean;
}

function pctChange(cur: number, prev: number): { value: string; positive: boolean } {
  if (prev === 0) return { value: cur > 0 ? '+∞' : '—', positive: cur > 0 };
  const pct = ((cur - prev) / prev) * 100;
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    positive: pct >= 0,
  };
}

export default function KpiSection({ data, hideOperations, showComparison = false }: Props) {
  const { t, formatCurrency, formatNumber } = useLanguage();

  const cards: KpiCard[] = useMemo(() => {
    const d = data || {
      spend: 0, leads: 0, clicks: 0, impressions: 0, cpl: 0, ctr: 0,
      activeClients: 0, activeCampaigns: 0,
      revenue: 0, purchases: 0, roas: 0,
      prevSpend: 0, prevLeads: 0, prevClicks: 0, prevImpressions: 0, prevCpl: 0, prevCtr: 0,
      prevRevenue: 0, prevPurchases: 0, prevRoas: 0,
    };

    const spendChange = pctChange(d.spend, d.prevSpend);
    const impressionsChange = pctChange(d.impressions, d.prevImpressions);
    const clicksChange = pctChange(d.clicks, d.prevClicks);

    return [
      { label: t('dashboard.totalSpend'), displayValue: formatCurrency(d.spend), icon: DollarSign, change: spendChange.value, positive: !spendChange.positive, showChange: showComparison },
      { label: t('dashboard.totalImpressions'), displayValue: formatNumber(d.impressions), icon: Eye, change: impressionsChange.value, positive: impressionsChange.positive, showChange: showComparison },
      { label: t('dashboard.totalClicks'), displayValue: formatNumber(d.clicks), icon: MousePointerClick, change: clicksChange.value, positive: clicksChange.positive, showChange: showComparison },
      ...(!hideOperations ? [
        { label: t('dashboard.activeClients'), displayValue: String(d.activeClients), icon: Building2, change: '', positive: true, showChange: false },
      ] : []),
    ];
  }, [data, t, formatCurrency, formatNumber, showComparison, hideOperations]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((kpi) => (
        <motion.div key={kpi.label} variants={itemAnim} className="kpi-card">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <kpi.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            {kpi.change && kpi.showChange && (
              <span className={`text-[10px] sm:text-xs font-medium ${kpi.positive ? 'text-success' : 'text-destructive'}`}>
                {kpi.change}
              </span>
            )}
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{kpi.displayValue}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{kpi.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
