import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { DollarSign, TrendingUp, Users, MousePointerClick, BarChart3, Building2, Zap, ShoppingBag } from 'lucide-react';
import type { KpiData } from '@/hooks/useDashboardMetrics';
import type { TranslationKey } from '@/i18n/translations';
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

interface KpiGroup {
  titleKey: TranslationKey;
  cards: KpiCard[];
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

  const sections: KpiGroup[] = useMemo(() => {
    const d = data || {
      spend: 0, leads: 0, clicks: 0, impressions: 0, cpl: 0, ctr: 0,
      activeClients: 0, activeCampaigns: 0,
      revenue: 0, purchases: 0, roas: 0,
      prevSpend: 0, prevLeads: 0, prevClicks: 0, prevImpressions: 0, prevCpl: 0, prevCtr: 0,
      prevRevenue: 0, prevPurchases: 0, prevRoas: 0,
    };

    const spendChange = pctChange(d.spend, d.prevSpend);
    const leadsChange = pctChange(d.leads, d.prevLeads);
    const clicksChange = pctChange(d.clicks, d.prevClicks);
    const cplChange = pctChange(d.cpl, d.prevCpl);
    cplChange.positive = !cplChange.positive || d.cpl === 0;
    const ctrChange = pctChange(d.ctr, d.prevCtr);
    const revenueChange = pctChange(d.revenue, d.prevRevenue);
    const purchasesChange = pctChange(d.purchases, d.prevPurchases);
    const roasChange = pctChange(d.roas, d.prevRoas);

    const hasEcom = d.revenue > 0 || d.purchases > 0;

    return [
      {
        titleKey: 'dashboard.financial',
        cards: [
          { label: t('dashboard.totalSpend'), displayValue: formatCurrency(d.spend), icon: DollarSign, change: spendChange.value, positive: !spendChange.positive, showChange: showComparison },
          { label: t('dashboard.costPerLead'), displayValue: formatCurrency(d.cpl), icon: TrendingUp, change: cplChange.value, positive: cplChange.positive, showChange: showComparison },
          ...(hasEcom ? [
            { label: 'Revenue', displayValue: formatCurrency(d.revenue), icon: DollarSign, change: revenueChange.value, positive: revenueChange.positive, showChange: showComparison },
            { label: 'ROAS', displayValue: d.roas.toFixed(2) + 'x', icon: TrendingUp, change: roasChange.value, positive: roasChange.positive, showChange: showComparison },
          ] : []),
        ],
      },
      {
        titleKey: 'dashboard.performanceSection',
        cards: [
          { label: t('dashboard.totalLeads'), displayValue: formatNumber(d.leads), icon: Users, change: leadsChange.value, positive: leadsChange.positive, showChange: showComparison },
          { label: t('dashboard.totalClicks'), displayValue: formatNumber(d.clicks), icon: MousePointerClick, change: clicksChange.value, positive: clicksChange.positive, showChange: showComparison },
          { label: t('dashboard.ctr'), displayValue: `${d.ctr.toFixed(2)}%`, icon: BarChart3, change: ctrChange.value, positive: ctrChange.positive, showChange: showComparison },
          ...(hasEcom ? [
            { label: 'Purchases', displayValue: formatNumber(d.purchases), icon: ShoppingBag, change: purchasesChange.value, positive: purchasesChange.positive, showChange: showComparison },
          ] : []),
        ],
      },
      {
        titleKey: 'dashboard.operations',
        cards: [
          { label: t('dashboard.activeClients'), displayValue: String(d.activeClients), icon: Building2, change: '', positive: true, showChange: false },
          { label: t('dashboard.activeCampaigns'), displayValue: String(d.activeCampaigns), icon: Zap, change: '', positive: true, showChange: false },
        ],
      },
    ];
  }, [data, t, formatCurrency, formatNumber]);

  const visibleSections = hideOperations ? sections.filter(s => s.titleKey !== 'dashboard.operations') : sections;

  return (
    <div className="space-y-4">
      {visibleSections.map((section) => (
        <div key={section.titleKey}>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {t(section.titleKey)}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {section.cards.map((kpi) => (
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
        </div>
      ))}
    </div>
  );
}
