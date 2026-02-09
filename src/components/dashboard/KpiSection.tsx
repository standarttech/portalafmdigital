import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { DollarSign, TrendingUp, Users, MousePointerClick, BarChart3, Building2, Zap } from 'lucide-react';
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
}

interface KpiGroup {
  titleKey: TranslationKey;
  cards: KpiCard[];
}

interface Props {
  data: KpiData | null;
}

function pctChange(cur: number, prev: number): { value: string; positive: boolean } {
  if (prev === 0) return { value: cur > 0 ? '+∞' : '—', positive: cur > 0 };
  const pct = ((cur - prev) / prev) * 100;
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    positive: pct >= 0,
  };
}

export default function KpiSection({ data }: Props) {
  const { t, formatCurrency, formatNumber } = useLanguage();

  const sections: KpiGroup[] = useMemo(() => {
    const d = data || {
      spend: 0, leads: 0, clicks: 0, impressions: 0, cpl: 0, ctr: 0,
      activeClients: 0, activeCampaigns: 0,
      prevSpend: 0, prevLeads: 0, prevClicks: 0, prevImpressions: 0, prevCpl: 0, prevCtr: 0,
    };

    const spendChange = pctChange(d.spend, d.prevSpend);
    const leadsChange = pctChange(d.leads, d.prevLeads);
    const clicksChange = pctChange(d.clicks, d.prevClicks);
    const cplChange = pctChange(d.cpl, d.prevCpl);
    cplChange.positive = !cplChange.positive || d.cpl === 0;
    const ctrChange = pctChange(d.ctr, d.prevCtr);

    return [
      {
        titleKey: 'dashboard.financial',
        cards: [
          { label: t('dashboard.totalSpend'), displayValue: formatCurrency(d.spend), icon: DollarSign, change: spendChange.value, positive: !spendChange.positive },
          { label: t('dashboard.costPerLead'), displayValue: formatCurrency(d.cpl), icon: TrendingUp, change: cplChange.value, positive: cplChange.positive },
        ],
      },
      {
        titleKey: 'dashboard.performanceSection',
        cards: [
          { label: t('dashboard.totalLeads'), displayValue: formatNumber(d.leads), icon: Users, change: leadsChange.value, positive: leadsChange.positive },
          { label: t('dashboard.totalClicks'), displayValue: formatNumber(d.clicks), icon: MousePointerClick, change: clicksChange.value, positive: clicksChange.positive },
          { label: t('dashboard.ctr'), displayValue: `${d.ctr.toFixed(2)}%`, icon: BarChart3, change: ctrChange.value, positive: ctrChange.positive },
        ],
      },
      {
        titleKey: 'dashboard.operations',
        cards: [
          { label: t('dashboard.activeClients'), displayValue: String(d.activeClients), icon: Building2, change: '', positive: true },
          { label: t('dashboard.activeCampaigns'), displayValue: String(d.activeCampaigns), icon: Zap, change: '', positive: true },
        ],
      },
    ];
  }, [data, t, formatCurrency, formatNumber]);

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.titleKey}>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {t(section.titleKey)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {section.cards.map((kpi) => (
              <motion.div key={kpi.label} variants={itemAnim} className="kpi-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <kpi.icon className="h-4 w-4 text-primary" />
                  </div>
                  {kpi.change && (
                    <span className={`text-xs font-medium ${kpi.positive ? 'text-success' : 'text-destructive'}`}>
                      {kpi.change}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.displayValue}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t('dashboard.vsPrevious')}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
